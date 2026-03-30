CREATE DATABASE IF NOT EXISTS ruuvi
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ruuvi;

-- ─────────────────────────────────────────────────────────────
-- Main table: raw data only
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurements (
 id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 ts                          DATETIME(3)       NOT NULL,
 device_id                   VARCHAR(17)       NOT NULL COMMENT 'MAC address of tag',
 device_name                 VARCHAR(100)      NOT NULL COMMENT 'RuuviTag name (user-configurable)',
 gateway_id                  VARCHAR(17)       NOT NULL COMMENT 'MAC address of gateway',
 gateway_name                VARCHAR(100)      NOT NULL COMMENT 'Gateway name (user-configurable)',
 rssi                        SMALLINT      COMMENT 'Received Signal Strength Indicator (dBm)',
 temperature                 DECIMAL(7,4)      COMMENT '°C',
 humidity                    DECIMAL(7,4)      COMMENT '% relative humidity',
 pressure                    INT UNSIGNED      COMMENT 'Pa (hectopascals × 100)',
 acceleration_x              DECIMAL(7,4)      COMMENT 'g',
 acceleration_y              DECIMAL(7,4)      COMMENT 'g',
 acceleration_z              DECIMAL(7,4)      COMMENT 'g',
 battery_voltage             DECIMAL(5,3)      COMMENT 'V',
 tx_power                    TINYINT           COMMENT 'dBm',
 movement_counter            SMALLINT UNSIGNED COMMENT 'Increments on movement',
 measurement_sequence_number MEDIUMINT UNSIGNED COMMENT 'Increments on each measurement, resets on reboot',
 data_format                 TINYINT UNSIGNED COMMENT 'RuuviTag data format version',

 INDEX idx_ts          (ts),
 INDEX idx_device      (device_id, ts),
 INDEX idx_device_name (device_name, ts),
 INDEX idx_gateway     (gateway_name, ts),
 INDEX idx_temp        (temperature)
) ENGINE=InnoDB
  ROW_FORMAT=COMPRESSED
    COMMENT='RuuviTag raw measurements';

-- ─────────────────────────────────────────────────────────────
-- View: all metrics with calculated fields
-- Used for historical dashboards
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW measurements_calculated AS
SELECT
    id,
    ts,
    device_id,
    device_name,
    gateway_id,
    gateway_name,
    rssi,

    -- Raw measurements
    temperature,
    humidity,
    pressure,
    acceleration_x,
    acceleration_y,
    acceleration_z,
    battery_voltage,
    tx_power,
    movement_counter,
    measurement_sequence_number,
    data_format,

    -- Saturation vapour pressure (Pa) — Magnus's formula
    611.2 * EXP((17.625 * temperature) / (243.04 + temperature))
                 AS equilibrium_vapor_pressure,

    -- Dew point (°C) — Magnus's formula
    -- Valid for T ≥ 0°C
    CASE
        WHEN temperature >= 0 THEN
            (243.04 * (LN(humidity / 100) + (17.625 * temperature) / (243.04 + temperature)))
                / (17.625 - LN(humidity / 100) - (17.625 * temperature) / (243.04 + temperature))
        END                                                                                   AS dew_point,

    -- Freezing point (°C) — Alduchov & Eskridge formula
    -- More accurate than the dew point when T < 0°C
    IF(temperature < 0, (273.86 * (LN(humidity / 100) + (22.587 * temperature) / (273.86 + temperature)))
        / (22.587 - LN(humidity / 100) - (22.587 * temperature) / (273.86 + temperature)),
       (243.04 * (LN(humidity / 100) + (17.625 * temperature) / (243.04 + temperature)))
           / (17.625 - LN(humidity / 100) - (17.625 * temperature) / (243.04 + temperature))) AS frost_point,

    -- Absolute humidity (g/m³)
    (
        (humidity / 100)
            * 611.2 * EXP((17.625 * temperature) / (243.04 + temperature))
            / (461.5 * (temperature + 273.15))
        ) * 1000                                                                              AS absolute_humidity,

    -- Air density humid (kg/m³)
    (
        (pressure - (humidity / 100) * 611.2 * EXP((17.625 * temperature) / (243.04 + temperature)))
            / (287.058 * (temperature + 273.15))
        ) + (
        (humidity / 100) * 611.2 * EXP((17.625 * temperature) / (243.04 + temperature))
            / (461.5 * (temperature + 273.15))
        )                                                                         AS air_density,

    -- Vapour pressure deficit — VPD (kPa)
    -- Ideal greenhouse conditions: 0.8–1.2 kPa
    (611.2 * EXP((17.625 * temperature) / (243.04 + temperature)) * (1 - humidity / 100)) / 1000
                 AS vapor_pressure_deficit,

    -- Acceleration vector standard (g)
    SQRT(
            acceleration_x * acceleration_x +
            acceleration_y * acceleration_y +
            acceleration_z * acceleration_z
    ) AS acceleration_total,

    -- Angles of inclination (degrees)
    DEGREES(ACOS(
            acceleration_x / NULLIF(SQRT(
                                            acceleration_x * acceleration_x +
                                            acceleration_y * acceleration_y +
                                            acceleration_z * acceleration_z
                                    ), 0)
            )) AS acceleration_angle_x,

    DEGREES(ACOS(
            acceleration_y / NULLIF(SQRT(
                                            acceleration_x * acceleration_x +
                                            acceleration_y * acceleration_y +
                                            acceleration_z * acceleration_z
                                    ), 0)
            )) AS acceleration_angle_y,

    DEGREES(ACOS(
            acceleration_z / NULLIF(SQRT(
                                            acceleration_x * acceleration_x +
                                            acceleration_y * acceleration_y +
                                            acceleration_z * acceleration_z
                                    ), 0)
            )) AS acceleration_angle_z,

    -- Battery percentage — CR2477 discharge curve (linear segments)
    CASE
        WHEN battery_voltage >= 3.0 THEN 100.0
        WHEN battery_voltage >= 2.9 THEN 75.0 + (battery_voltage - 2.9) / (3.0 - 2.9) * 25.0
        WHEN battery_voltage >= 2.7 THEN 50.0 + (battery_voltage - 2.7) / (2.9 - 2.7) * 25.0
        WHEN battery_voltage >= 2.5 THEN 25.0 + (battery_voltage - 2.5) / (2.7 - 2.5) * 25.0
        WHEN battery_voltage >= 2.0 THEN (battery_voltage - 2.0) / (2.5 - 2.0) * 25.0
        ELSE 0.0
        END AS battery_percentage

FROM measurements;

-- ─────────────────────────────────────────────────────────────
-- View: latest metric calculated by device
-- Used for stat panels / gauges
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW latest_measurements AS
SELECT c.*
FROM measurements_calculated c
         INNER JOIN (
    SELECT device_id, MAX(ts) AS max_ts
    FROM measurements
    GROUP BY device_id
) latest ON c.device_id = latest.device_id
    AND c.ts         = latest.max_ts;