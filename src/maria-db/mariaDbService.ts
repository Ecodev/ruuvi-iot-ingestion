import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { config } from '../config/env.js';
import { logger } from '../logger/logger.js';
import { RuuviData } from '../ruuvi/ruuviData.js';
import path from 'path';
import fs from 'fs';

let pool: Pool;
const gatewayCache = new Map<string, number>(); // gatewayId → id
const sensorCache = new Map<string, number>(); // sensorId → id

export function getMariaPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.maria.host,
      port: config.maria.port,
      user: config.maria.user,
      password: config.maria.password,
      database: config.maria.database,
      waitForConnections: true,
      connectionLimit: 5, // low load → 5 connections are sufficient
      queueLimit: 100,
      timezone: 'Z', // UTC everywhere
      multipleStatements: true,
    });
    logger.info('MariaDB pool created');
  }
  return pool;
}
export async function initMariaSchema(): Promise<void> {
  const sqlPath = path.resolve('schema/mariadb_init.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Schema file not found: ${sqlPath}`);
  }
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  const conn = await getMariaPool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(sql);
    await conn.commit();
    logger.info('MariaDB schema initialised from schema/mariadb_init.sql');
  } catch (err) {
    await conn.rollback();
    logger.error({ err }, 'MariaDB schema init failed');
    throw err; // We're logging the error to prevent the system from starting up
  } finally {
    conn.release();
  }
}

// Resolves or creates the gateway row — only sets defaults on INSERT,
// never overwrites admin-edited config columns on existing rows.
async function resolveGatewayFk(conn: PoolConnection, d: RuuviData): Promise<number> {
  const cached = gatewayCache.get(d.gwMac);
  if (cached !== undefined) return cached;

  await conn.query(
    `INSERT INTO gateways (gw_mac, gateway_name, mqtt_server, last_seen)
     VALUES (?, ?, ?, NOW(3))
     ON DUPLICATE KEY UPDATE last_seen = NOW(3)`,
    [d.gwMac, d.gatewayName, config.mqtt.host],
  );

  const [[row]] = await conn.query<any[]>(`SELECT id FROM gateways WHERE gw_mac = ?`, [d.gwMac]);
  gatewayCache.set(d.gwMac, row.id);
  return row.id;
}

// Resolves or creates the sensor row — only sets defaults on INSERT,
// only updates gateway_fk/last_seen on existing rows (never sensor_name).
async function resolveSensorFk(conn: PoolConnection, d: RuuviData, gatewayFk: number): Promise<number> {
  const cached = sensorCache.get(d.sensorId);
  if (cached !== undefined) {
    // Keep the live gateway association up to date without blocking
    void conn.query(`UPDATE sensors SET gateway_fk = ?, last_seen = NOW(3) WHERE id = ?`, [gatewayFk, cached]);
    return cached;
  }

  await conn.query(
    `INSERT INTO sensors (sensor_id, sensor_name, gateway_fk, last_seen)
     VALUES (?, ?, ?, NOW(3))
     ON DUPLICATE KEY UPDATE gateway_fk = VALUES(gateway_fk), last_seen = NOW(3)`,
    [d.sensorId, d.sensorName, gatewayFk],
  );

  const [[row]] = await conn.query<any[]>(`SELECT id FROM sensors WHERE sensor_id = ?`, [d.sensorId]);
  sensorCache.set(d.sensorId, row.id);
  return row.id;
}

const INSERT_SQL = `
    INSERT INTO measurements (
        ts, sensor_fk, gateway_fk , rssi,
        temperature, humidity, pressure,
        acceleration_x, acceleration_y, acceleration_z,
        battery_voltage, tx_power, movement_counter,
        measurement_sequence_number, data_format
    ) VALUES ?
`;

export async function writeBatch(samples: RuuviData[]): Promise<void> {
  if (!samples.length) return;
  let conn: PoolConnection | undefined;
  try {
    conn = await getMariaPool().getConnection();

    // Resolve unique gateways first (dedup to avoid contention)
    const uniqueGateways = [...new Map(samples.map((d) => [d.gwMac, d])).values()];
    const gatewayFkMap = new Map<string, number>();
    for (const d of uniqueGateways) {
      const fk = await resolveGatewayFk(conn, d);
      gatewayFkMap.set(d.gwMac, fk);
    }

    const rows: any[] = [];
    for (const d of samples) {
      const gatewayFk = gatewayFkMap.get(d.gwMac)!;
      const sensorFk = await resolveSensorFk(conn, d, gatewayFk);
      const ts = new Date(d.timestamp).toISOString().replace('T', ' ').replace('Z', '');
      rows.push([
        ts,
        sensorFk,
        gatewayFk,
        d.rssi ?? null,
        d.temperature ?? null,
        d.humidity ?? null,
        d.pressure ?? null,
        d.accelerationX ?? null,
        d.accelerationY ?? null,
        d.accelerationZ ?? null,
        d.batteryVoltage ?? null,
        d.txPower ?? null,
        d.movementCounter ?? null,
        d.measurementSequenceNumber ?? null,
        d.dataFormat ?? null,
      ]);
    }
    await conn.query(INSERT_SQL, [rows]);
    logger.debug({ count: rows.length }, 'MariaDB batch written');
  } catch (err) {
    logger.error({ err }, 'MariaDB write failed');
  } finally {
    conn?.release();
  }
}
