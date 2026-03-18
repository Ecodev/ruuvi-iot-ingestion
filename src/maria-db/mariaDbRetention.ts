import { getMariaPool } from './mariaDbService.js';
import { config } from '../config/env.js';
import { logger } from '../logger/logger.js';

// ── Initialising the downsample table ───
export async function initDownsampleSchema(): Promise<void> {
  const conn = await getMariaPool().getConnection();
  try {
    // Table of hourly averages — same fields as measurements
    await conn.query(`
      CREATE TABLE IF NOT EXISTS measurements_hourly (
        id                           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ts_hour                      DATETIME        NOT NULL  COMMENT 'Time rounded to the nearest hour (UTC)',
        device_id                    VARCHAR(17)     NOT NULL,
        device_name                  VARCHAR(100)    NOT NULL,
        gateway_id                   VARCHAR(17)     NOT NULL,
        gateway_name                 VARCHAR(100)    NOT NULL,
        sample_count                 SMALLINT UNSIGNED NOT NULL COMMENT 'Number of aggregated measurements',
        -- Averages of raw measurements
        rssi                         DECIMAL(6,2),
        temperature                  DECIMAL(7,4),
        humidity                     DECIMAL(7,4),
        pressure                     DECIMAL(10,4),
        acceleration_x               DECIMAL(7,4),
        acceleration_y               DECIMAL(7,4),
        acceleration_z               DECIMAL(7,4),
        battery_voltage              DECIMAL(5,3),
        movement_counter_delta       SMALLINT UNSIGNED COMMENT 'Number of transactions during the period',
        absolute_humidity            DECIMAL(8,4),
        dew_point                    DECIMAL(7,4),
        frost_point                  DECIMAL(7,4),
        vapor_pressure_deficit       DECIMAL(8,5),
        acceleration_total           DECIMAL(7,4),
        battery_percentage           DECIMAL(5,2),
        -- Min/Max temperature (useful for the cold chain)
        temperature_min              DECIMAL(7,4),
        temperature_max              DECIMAL(7,4),
        humidity_min                 DECIMAL(7,4),
        humidity_max                 DECIMAL(7,4),

        UNIQUE KEY uq_device_hour (device_id, ts_hour),
        INDEX idx_hour             (ts_hour),
        INDEX idx_device_hour      (device_id, ts_hour),
        INDEX idx_device_name_hour (device_name, ts_hour)
      ) ENGINE=InnoDB ROW_FORMAT=COMPRESSED
        COMMENT='RuuviTag data aggregated by the hour'
    `);

    logger.info('MariaDB downsample schema ready');
  } finally {
    conn.release();
  }
}

// ── Downsampling: hourly aggregation ───
async function runDownsample(): Promise<void> {
  const conn = await getMariaPool().getConnection();
  try {
    // We aggregate the full hours that are not yet present in `measurements_hourly`
    //  DATE_FORMAT rounds to the nearest hour
    const [result] = (await conn.query(`
      INSERT INTO measurements_hourly (
        ts_hour, device_id, device_name, gateway_id, gateway_name,
        sample_count,
        rssi, temperature, humidity, pressure,
        acceleration_x, acceleration_y, acceleration_z,
        battery_voltage,
        movement_counter_delta,
        absolute_humidity, dew_point, frost_point, vapor_pressure_deficit,
        acceleration_total, battery_percentage,
        temperature_min, temperature_max,
        humidity_min, humidity_max
      )
      SELECT
        DATE_FORMAT(ts, '%Y-%m-%d %H:00:00') AS ts_hour,
        device_id,
        device_name,
        gateway_id,
        gateway_name,
        COUNT(*)                             AS sample_count,
        AVG(rssi)                            AS rssi,
        AVG(temperature)                     AS temperature,
        AVG(humidity)                        AS humidity,
        AVG(pressure)                        AS pressure,
        AVG(acceleration_x)                  AS acceleration_x,
        AVG(acceleration_y)                  AS acceleration_y,
        AVG(acceleration_z)                  AS acceleration_z,
        AVG(battery_voltage)                 AS battery_voltage,
        MAX(movement_counter) - MIN(movement_counter) AS movement_counter_delta,
        AVG(absolute_humidity)               AS absolute_humidity,
        AVG(dew_point)                       AS dew_point,
        AVG(frost_point)                     AS frost_point,
        AVG(vapor_pressure_deficit)          AS vapor_pressure_deficit,
        AVG(acceleration_total)              AS acceleration_total,
        AVG(battery_percentage)              AS battery_percentage,
        MIN(temperature)                     AS temperature_min,
        MAX(temperature)                     AS temperature_max,
        MIN(humidity)                        AS humidity_min,
        MAX(humidity)                        AS humidity_max
      FROM measurements
      WHERE
        -- Only full hours (not the current hour)
        ts < DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00')
        -- Only the hours that have not yet been added up
        AND DATE_FORMAT(ts, '%Y-%m-%d %H:00:00') NOT IN (
          SELECT ts_hour FROM measurements_hourly
          WHERE device_id = measurements.device_id
        )
      GROUP BY
        DATE_FORMAT(ts, '%Y-%m-%d %H:00:00'),
        device_id, device_name, gateway_id, gateway_name
      ON DUPLICATE KEY UPDATE
        sample_count       = VALUES(sample_count),
        temperature        = VALUES(temperature),
        temperature_min    = VALUES(temperature_min),
        temperature_max    = VALUES(temperature_max),
        humidity           = VALUES(humidity),
        humidity_min       = VALUES(humidity_min),
        humidity_max       = VALUES(humidity_max)
    `)) as any;

    const affected = result?.affectedRows ?? 0;
    if (affected > 0) {
      logger.info({ rows: affected }, 'MariaDB downsample: hourly rows inserted');
    }

    // Delete aggregated raw data if enabled
    if (config.mariaRetention.downsampleDeleteRaw) {
      const [del] = (await conn.query(`
        DELETE FROM measurements
        WHERE ts < DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00')
          AND DATE_FORMAT(ts, '%Y-%m-%d %H:00:00') IN (
            SELECT ts_hour FROM measurements_hourly
          )
      `)) as any;

      const deleted = del?.affectedRows ?? 0;
      if (deleted > 0) {
        logger.info({ rows: deleted }, 'MariaDB downsample: raw rows deleted after aggregation');
      }
    }
  } catch (err) {
    logger.error({ err }, 'MariaDB downsample failed');
  } finally {
    conn.release();
  }
}

// ── Data retention: deletion of data that is too old ──
async function runRetention(): Promise<void> {
  const conn = await getMariaPool().getConnection();
  try {
    // Raw data
    if (config.mariaRetention.enabled) {
      const [raw] = (await conn.query(
        `
        DELETE FROM measurements
        WHERE ts < NOW() - INTERVAL ? DAY
        LIMIT 5000
      `,
        [config.mariaRetention.retentionDays],
      )) as any;

      const deleted = raw?.affectedRows ?? 0;
      if (deleted > 0) {
        logger.info(
          { rows: deleted, days: config.mariaRetention.retentionDays },
          'MariaDB retention: raw rows deleted',
        );
      }
    }

    // Downsampled data
    if (config.mariaRetention.downsampleEnabled && config.mariaRetention.downsampleRetentionDays > 0) {
      const [hourly] = (await conn.query(
        `
        DELETE FROM measurements_hourly
        WHERE ts_hour < NOW() - INTERVAL ? DAY
        LIMIT 5000
      `,
        [config.mariaRetention.downsampleRetentionDays],
      )) as any;

      const deleted = hourly?.affectedRows ?? 0;
      if (deleted > 0) {
        logger.info(
          { rows: deleted, days: config.mariaRetention.downsampleRetentionDays },
          'MariaDB retention: hourly rows deleted',
        );
      }
    }
  } catch (err) {
    logger.error({ err }, 'MariaDB retention failed');
  } finally {
    conn.release();
  }
}

// ── Scheduler ──
export function startMariaMaintenanceTasks(): void {
  const intervalMs = config.mariaRetention.maintenanceIntervalHours * 60 * 60 * 1000;

  // Run immediately on startup, then every X hours
  const run = async () => {
    logger.info('MariaDB maintenance tasks starting...');
    if (config.mariaRetention.downsampleEnabled) await runDownsample();
    if (config.mariaRetention.enabled) await runRetention();
    logger.info('MariaDB maintenance tasks done');
  };

  run(); // first immediate execution
  setInterval(run, intervalMs);

  logger.info(
    { intervalHours: config.mariaRetention.maintenanceIntervalHours },
    'MariaDB maintenance scheduler started',
  );
}
