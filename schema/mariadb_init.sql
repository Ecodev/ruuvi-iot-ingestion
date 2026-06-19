-- ─────────────────────────────────────────────────────────────
-- Gateways registry + configuration
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gateways
(
    id           SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    gw_mac   VARCHAR(17)  NOT NULL UNIQUE COMMENT 'MAC address of gateway (no separators, uppercase)',
    gateway_name VARCHAR(100) NOT NULL COMMENT 'Gateway name (admin-configurable)',
    first_seen   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Timestamp when the gateway was first seen',
    last_seen    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Timestamp when the gateway was last seen'
        ON UPDATE CURRENT_TIMESTAMP(3),

    -- Auth used to serve /ruuvi-gw-cfg to THIS gateway
    gw_cfg_user         VARCHAR(100) DEFAULT NULL COMMENT 'Username for gateway to fetch its config (NULL = no auth)',
    gw_cfg_password     VARCHAR(255) DEFAULT NULL COMMENT 'Password for gateway to fetch its config (NULL = no auth)',
    gw_cfg_bearer_token VARCHAR(255) DEFAULT NULL   COMMENT 'Bearer token for gateway to fetch its config (NULL = no auth)',

    -- remote_cfg_* are used when the gateway fetches its configuration from the cloud (instead of local DB)
    remote_cfg_use                       BOOLEAN      NOT NULL DEFAULT TRUE,
    remote_cfg_auth_type                 VARCHAR(10)  NOT NULL DEFAULT 'basic' COMMENT 'basic | bearer',
    remote_cfg_refresh_interval_minutes  SMALLINT UNSIGNED NOT NULL DEFAULT 60 COMMENT 'Period for checking a new gateway configuration on the remote configuration server (in minutes)',

    -- Network
    use_eth           BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Whether the gateway should use WiFi if available',
    eth_dhcp          BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'IP configuration mode (DHCP/manual) when connected via Ethernet',
    wifi_sta_ssid     VARCHAR(100) DEFAULT '' COMMENT 'Wi-Fi SSID for station mode (empty = disabled)',
    wifi_sta_password VARCHAR(100) DEFAULT '' COMMENT 'Wi-Fi password for station mode',

    -- HTTP relay (Ruuvi cloud / custom)
    use_http_ruuvi BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Enable HTTP relaying mode to Ruuvi cloud',
    use_http       BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Enable HTTP relaying mode to a custom server',

    -- MQTT (params pushed TO the physical gateway)
    use_mqtt                       BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Enable MQTT relaying mode',
    mqtt_disable_retained_messages BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Disable MQTT retained messages',
    mqtt_transport                 VARCHAR(10)  NOT NULL DEFAULT 'SSL' COMMENT 'CP - MQTT over TCP, SSL - MQTT over SSL, WS - MQTT over WebSockets, WSS - MQTT over secure WebSockets',
    mqtt_data_format               VARCHAR(30)  NOT NULL DEFAULT 'ruuvi_raw_and_decoded' COMMENT 'ruuvi_raw - raw data only, ruuvi_raw_and_decoded - raw and decoded data, ruuvi_decoded - decoded data only',
    mqtt_server                    VARCHAR(255) NOT NULL COMMENT 'MQTT server address',
    mqtt_port                      SMALLINT UNSIGNED NOT NULL DEFAULT 8883 COMMENT 'MQTT server port',
    mqtt_sending_interval          SMALLINT UNSIGNED NOT NULL DEFAULT 60 COMMENT 'Interval for sending data to MQTT server (in seconds)',
    mqtt_user                      VARCHAR(100) DEFAULT '' COMMENT 'User name for MQTT authentication',
    mqtt_use_ssl_client_cert       BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Enable use of SSL client certificate for authentication on the MQTT server',
    mqtt_use_ssl_server_cert       BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Enable use of SSL server certificate to authenticate the MQTT server',

    -- LAN auth (gateway's own web UI)
    lan_auth_type            VARCHAR(30)  NOT NULL DEFAULT 'lan_auth_ruuvi' COMMENT 'lan_auth_default'' - Ruuvi-authentication with username ''Admin'' and as a password the Unique ID is used (in format XX:XX:XX:XX:XX:XX:XX:XX) which is printed on the bottom of the Ruuvi Gateway. ''lan_auth_ruuvi'' - Ruuvi-authentication, login/password should be specified in ''lan_auth_user'' and ''lan_auth_pass''. ''lan_auth_deny'' - deny access from LAN. ''lan_auth_allow'' - allow access from LAN without a password. ''lan_auth_basic'' - HTTP basic authentication, login/password should be specified in ''lan_auth_user'' and ''lan_auth_pass''. ''lan_auth_digest'' - HTTP digest authentication, login/password should be specified in ''lan_auth_user'' and ''lan_auth_pass''.',
    lan_auth_user             VARCHAR(100) DEFAULT 'ecoadmin' COMMENT 'Login for authentication when accessing from LAN',
    lan_auth_api_key_use      BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Use API key (token) for HTTP bearer authentication for read-only access from LAN',
    lan_auth_api_key          VARCHAR(255) DEFAULT NULL COMMENT 'API key (token) for HTTP bearer authentication for read-only access from LAN',
    lan_auth_api_key_rw_use   BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Use API key (token) for HTTP bearer authentication for read/write access from LAN',
    lan_auth_api_key_rw       VARCHAR(255) DEFAULT NULL COMMENT 'API key (token) for HTTP bearer authentication for read/write access from LAN',

    -- Auto-update
    auto_update_cycle            VARCHAR(20) NOT NULL DEFAULT 'regular' COMMENT 'regular'' - check for updates 1-2 times a day according to the schedule, install new versions only 2 weeks after release. ''beta'' - install new versions as soon as a new version is released. ''manual'' - do not check for firmware updates and do not install updates automatically',
    auto_update_weekdays_bitmask TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Bit-mask for weekdays: bit 0 - Sunday, bit 1 - Monday, ..., bit 6 - Saturday',
    auto_update_interval_from    TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Configure firmware auto-updating schedule: start time (local timezone)- 0 - 00:00, 1 - 01:00, 2 - 02:00, ..., 23 - 23:00',
    auto_update_interval_to      TINYINT UNSIGNED NOT NULL DEFAULT 24 COMMENT 'Configure firmware auto-updating schedule: end time (local timezone) - 1 - 01:00, 2 - 02:00, ..., 24 - 24:00',
    auto_update_tz_offset_hours  TINYINT     NOT NULL DEFAULT 2 COMMENT 'Configure firmware auto-updating schedule: local timezone offset (hours)',

    -- NTP
    ntp_use         BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Enable time synchronization from NTP servers',
    ntp_use_dhcp    BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'Use DHCP to get the list of NTP servers',
    ntp_server1     VARCHAR(255) DEFAULT 'ntp.metas.ch' COMMENT 'Address of NTP server 1 (used only if ''ntp_use_dhcp'' is false).',
    ntp_server2     VARCHAR(255) DEFAULT 'time.cloudflare.com' COMMENT 'Address of NTP server 2 (used only if ''ntp_use_dhcp'' is false).',
    ntp_server3     VARCHAR(255) DEFAULT 'pool.ntp.org' COMMENT 'Address of NTP server 3 (used only if ''ntp_use_dhcp'' is false).',
    ntp_server4     VARCHAR(255) DEFAULT 'time.ruuvi.com' COMMENT 'Address of NTP server 4 (used only if ''ntp_use_dhcp'' is false).',

    -- BLE scanning
    company_id              SMALLINT UNSIGNED NOT NULL DEFAULT 1177 COMMENT 'Company ID for filtering messages from Bluetooth-sensors.',
    company_use_filtering   BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Enable filtering messages from Bluetooth sensors by company ID.',
    scan_coded_phy          BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Configure Bluetooth scanning: Use coded PHY (long range)',
    scan_1mbit_phy          BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Configure Bluetooth scanning: Use Use 1 MBit/s PHY',
    scan_2mbit_phy          BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Configure Bluetooth scanning: Use 2 MBit/s PHY',
    scan_extended_payload   BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Configure Bluetooth scanning: Use extended payload',
    scan_channel_37         BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Configure Bluetooth scanning: Use channel 37',
    scan_channel_38         BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Configure Bluetooth scanning: Use channel 38',
    scan_channel_39         BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Configure Bluetooth scanning: Use channel 39',
    scan_filter_allow_listed BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'If it''s true, only the sensors in the list will pass through the filter, other sensors will be filtered out. If it''s false, then all sensors will pass through the filter except those in the list.',
    scan_filter_list        JSON    DEFAULT NULL COMMENT 'Type of filtering is set by scan_filter_allow_listed. If scan_filter_list is empty, then filtering is not active',

    coordinates    VARCHAR(100) DEFAULT '' COMMENT 'GPS-coordinates of the Gateway',
    fw_update_url  VARCHAR(255) DEFAULT 'https://network.ruuvi.com/firmwareupdate' COMMENT 'URL of firmware update server',

    INDEX idx_gateway_id (gw_mac) COMMENT 'Index on gateway MAC address',
    INDEX idx_gateway_name (gateway_name) COMMENT 'Index on gateway name'
) ENGINE = InnoDB
    COMMENT ='Ruuvi Gateway registry and remote configuration';

-- ─────────────────────────────────────────────────────────────
-- Sensors registry (RuuviTags)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensors
(
    id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sensor_mac   VARCHAR(17)  NOT NULL UNIQUE COMMENT 'MAC address of RuuviTag',
    sensor_name VARCHAR(100) NOT NULL COMMENT 'RuuviTag name (admin-configurable)',
    gateway_fk  SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Gateway that last relayed data for this sensor',
    first_seen  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Timestamp when the sensor was first seen',
    last_seen   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Timestamp when the sensor was last seen'
        ON UPDATE CURRENT_TIMESTAMP(3),

    CONSTRAINT fk_sensors_gateway
        FOREIGN KEY (gateway_fk) REFERENCES gateways (id)
            ON DELETE SET NULL
            ON UPDATE CASCADE,

    INDEX idx_sensor_mac (sensor_mac) COMMENT 'Index on sensor MAC address',
    INDEX idx_sensor_name (sensor_name) COMMENT 'Index on sensor name',
    INDEX idx_gateway_fk (gateway_fk) COMMENT 'Index on gateway foreign key for faster lookups of sensors by gateway'
) ENGINE = InnoDB
    COMMENT ='RuuviTag sensor registry';

-- ─────────────────────────────────────────────────────────────
-- Main table: raw data only
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurements
(
    id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ts                          DATETIME(3)       NOT NULL COMMENT 'Timestamp of the measurement (UTC)',
    sensor_fk                   SMALLINT UNSIGNED NOT NULL COMMENT 'Foreign key to sensors table',
    gateway_fk                  SMALLINT UNSIGNED NOT NULL COMMENT 'Foreign key to gateways table',
    rssi                        SMALLINT COMMENT 'Received Signal Strength Indicator (dBm)',
    temperature                 DECIMAL(7, 4) COMMENT '°C',
    humidity                    DECIMAL(7, 4) COMMENT '% relative humidity',
    pressure                    INT UNSIGNED COMMENT 'Pa (hectopascals × 100)',
    acceleration_x              DECIMAL(7, 4) COMMENT 'g',
    acceleration_y              DECIMAL(7, 4) COMMENT 'g',
    acceleration_z              DECIMAL(7, 4) COMMENT 'g',
    battery_voltage             DECIMAL(5, 3) COMMENT 'V',
    tx_power                    TINYINT COMMENT 'dBm',
    movement_counter            SMALLINT UNSIGNED COMMENT 'Increments on movement',
    measurement_sequence_number MEDIUMINT UNSIGNED COMMENT 'Increments on each measurement, resets on reboot',
    data_format                 TINYINT UNSIGNED COMMENT 'RuuviTag data format version',

    CONSTRAINT fk_measurements_sensor
        FOREIGN KEY (sensor_fk) REFERENCES sensors (id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE,
    CONSTRAINT fk_measurements_gateway
        FOREIGN KEY (gateway_fk) REFERENCES gateways (id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE,
    INDEX idx_ts (ts) COMMENT 'Index on timestamp',
    INDEX idx_sensor (sensor_fk, ts) COMMENT 'Index on sensor foreign key and timestamp',
    INDEX idx_gateway (gateway_fk, ts) COMMENT 'Index on gateway foreign key and timestamp',
    INDEX idx_temp (temperature) COMMENT 'Index on temperature'
) ENGINE = InnoDB
  ROW_FORMAT = COMPRESSED
    COMMENT ='RuuviTag raw measurements';

-- ─────────────────────────────────────────────────────────────
-- Downsample table - hourly averages
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurements_hourly
(
    id                         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ts_hour                    DATETIME          NOT NULL COMMENT 'Time rounded to the nearest hour (UTC)',
    sensor_fk                  SMALLINT UNSIGNED NOT NULL COMMENT 'Foreign key to sensors table',
    gateway_fk                 SMALLINT UNSIGNED NOT NULL COMMENT 'Foreign key to gateways table',
    sample_count               SMALLINT UNSIGNED NOT NULL COMMENT 'Number of aggregated measurements',
    rssi                       DECIMAL(6, 2) COMMENT 'Average RSSI (dBm)',
    rssi_min                   DECIMAL(6, 2) COMMENT 'Minimum RSSI during the hour (dBm)',
    rssi_max                   DECIMAL(6, 2) COMMENT 'Maximum RSSI during the hour (dBm)',
    temperature                DECIMAL(7, 4) COMMENT 'Average °C',
    temperature_min            DECIMAL(7, 4) COMMENT 'Minimum temperature during the hour (°C)',
    temperature_max            DECIMAL(7, 4) COMMENT 'Maximum temperature during the hour (°C)',
    humidity                   DECIMAL(7, 4) COMMENT 'Average % relative humidity',
    humidity_min               DECIMAL(7, 4) COMMENT 'Minimum humidity during the hour (% relative humidity)',
    humidity_max               DECIMAL(7, 4) COMMENT 'Maximum humidity during the hour (% relative humidity)',
    pressure                   DECIMAL(10, 4) COMMENT 'Average Pa (hectopascals × 100)',
    pressure_min               DECIMAL(10, 4) COMMENT 'Minimum pressure during the hour (Pa)',
    pressure_max               DECIMAL(10, 4) COMMENT 'Maximum pressure during the hour (Pa)',
    acceleration_x             DECIMAL(7, 4) COMMENT 'Average g',
    acceleration_x_min         DECIMAL(7, 4) COMMENT 'Minimum acceleration x during the hour (g)',
    acceleration_x_max         DECIMAL(7, 4) COMMENT 'Maximum acceleration x during the hour (g)',
    acceleration_y             DECIMAL(7, 4) COMMENT 'Average g',
    acceleration_y_min         DECIMAL(7, 4) COMMENT 'Minimum acceleration y during the hour (g)',
    acceleration_y_max         DECIMAL(7, 4) COMMENT 'Maximum acceleration y during the hour (g)',
    acceleration_z             DECIMAL(7, 4) COMMENT 'Average g',
    acceleration_z_min         DECIMAL(7, 4) COMMENT 'Minimum acceleration z during the hour (g)',
    acceleration_z_max         DECIMAL(7, 4) COMMENT 'Maximum acceleration z during the hour (g)',
    acceleration_total         DECIMAL(7, 4) COMMENT 'Average of acceleration vector standard (g)',
    acceleration_total_min     DECIMAL(7, 4) COMMENT 'Minimum acceleration vector standard during the hour (g)',
    acceleration_total_max     DECIMAL(7, 4) COMMENT 'Maximum acceleration vector standard during the hour (g)',
    battery_voltage            DECIMAL(5, 3) COMMENT 'Average V',
    movement_counter_delta     SMALLINT UNSIGNED COMMENT 'Number of transactions during the period',
    absolute_humidity          DECIMAL(8, 4) COMMENT 'Average of absolute humidity (g/m³)',
    absolute_humidity_min      DECIMAL(8, 4) COMMENT 'Minimum absolute humidity during the hour (g/m³)',
    absolute_humidity_max      DECIMAL(8, 4) COMMENT 'Maximum absolute humidity during the hour (g/m³)',
    dew_point                  DECIMAL(7, 4) COMMENT 'Average of dew point (°C)',
    dew_point_min              DECIMAL(7, 4) COMMENT 'Minimum dew point during the hour (°C)',
    dew_point_max              DECIMAL(7, 4) COMMENT 'Maximum dew point during the hour (°C)',
    frost_point                DECIMAL(7, 4) COMMENT 'Average of frost point (°C)',
    frost_point_min            DECIMAL(7, 4) COMMENT 'Minimum frost point during the hour (°C)',
    frost_point_max            DECIMAL(7, 4) COMMENT 'Maximum frost point during the hour (°C)',
    vapor_pressure_deficit     DECIMAL(8, 5) COMMENT 'Average of vapor pressure deficit (kPa)',
    vapor_pressure_deficit_min DECIMAL(8, 5) COMMENT 'Minimum vapor pressure deficit during the hour (kPa)',
    vapor_pressure_deficit_max DECIMAL(8, 5) COMMENT 'Maximum vapor pressure deficit during the hour (kPa)',
    battery_percentage         DECIMAL(5, 2) COMMENT 'Average of battery percentage (%)',

    CONSTRAINT fk_hourly_sensor
        FOREIGN KEY (sensor_fk) REFERENCES sensors (id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE,
    CONSTRAINT fk_hourly_gateway
        FOREIGN KEY (gateway_fk) REFERENCES gateways (id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE,

    UNIQUE KEY uq_sensor_gateway_hour (sensor_fk, gateway_fk, ts_hour) COMMENT 'Unique constraint to prevent duplicate hourly records for the same sensor and gateway',
    INDEX idx_hour (ts_hour) COMMENT 'Index on hourly timestamp',
    INDEX idx_sensor_hour (sensor_fk, ts_hour) COMMENT 'Index on sensor foreign key and hourly timestamp'
) ENGINE = InnoDB
  ROW_FORMAT = COMPRESSED
    COMMENT ='RuuviTag data aggregated by the hour';

-- ─────────────────────────────────────────────────────────────
-- View: all metrics with calculated fields
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW measurements_calculated AS
SELECT m.id,
       m.ts,
       m.sensor_fk,
       m.gateway_fk,
       s.sensor_mac,
       s.sensor_name,
       g.gw_mac,
       g.gateway_name,
       m.rssi,
       m.temperature,
       m.humidity,
       m.pressure,
       m.acceleration_x,
       m.acceleration_y,
       m.acceleration_z,
       m.battery_voltage,
       m.tx_power,
       m.movement_counter,
       m.measurement_sequence_number,
       m.data_format,
       -- Saturation vapour pressure (Pa) — Magnus's formula
       611.2 * EXP((17.625 * m.temperature) / (243.04 + m.temperature))                               AS equilibrium_vapor_pressure,
       m.pressure / 100                                                                               AS pressure_hectopascals,
       m.pressure / 133.322                                                                           AS pressure_millimeters_of_mercury,
       m.pressure / 3386.39                                                                           AS pressure_inches_of_mercury,

       -- Vapour pressure deficit — VPD (kPa)
       -- Ideal greenhouse conditions: 0.8–1.2 kPa
       (611.2 * EXP((17.625 * m.temperature) / (243.04 + m.temperature)) * (1 - m.humidity / 100)) / 1000  AS vapor_pressure_deficit,

       -- Temperature in Fahrenheit
         m.temperature * 9 / 5 + 32                                                                      AS temperature_fahrenheit,
       -- Temperature in Kelvin
         m.temperature + 273.15                                                                          AS temperature_kelvin,
       -- Dew point (°C) — Magnus's formula
       -- Valid for T ≥ 0°C
       CASE
           WHEN m.temperature >= 0 THEN
               (243.04 * (LN(m.humidity / 100) + (17.625 * m.temperature) / (243.04 + m.temperature)))
                   / (17.625 - LN(m.humidity / 100) - (17.625 * m.temperature) / (243.04 + m.temperature))
           END                                                                                         AS dew_point,

       -- Freezing point (°C) — Alduchov & Eskridge formula
       -- More accurate than the dew point when T < 0°C
       IF(m.temperature < 0, (273.86 * (LN(m.humidity / 100) + (22.587 * m.temperature) / (273.86 + m.temperature)))
           / (22.587 - LN(m.humidity / 100) - (22.587 * m.temperature) / (273.86 + m.temperature)),
          (243.04 * (LN(m.humidity / 100) + (17.625 * m.temperature) / (243.04 + m.temperature)))
              / (17.625 - LN(m.humidity / 100) - (17.625 * m.temperature) / (243.04 + m.temperature))) AS frost_point,

       -- Absolute humidity (g/m³)
       (
           (m.humidity / 100)
               * 611.2 * EXP((17.625 * m.temperature) / (243.04 + m.temperature))
               / (461.5 * (m.temperature + 273.15))
           ) * 1000                                                                                    AS absolute_humidity,

       -- Air density humid (kg/m³)
       (
           (m.pressure - (m.humidity / 100) * 611.2 * EXP((17.625 * m.temperature) / (243.04 + m.temperature)))
               / (287.058 * (m.temperature + 273.15))
           ) + (
           (m.humidity / 100) * 611.2 * EXP((17.625 * m.temperature) / (243.04 + m.temperature))
               / (461.5 * (m.temperature + 273.15))
           )                                                                                           AS air_density,

       -- Acceleration vector standard (g)
       SQRT(
               m.acceleration_x * m.acceleration_x +
               m.acceleration_y * m.acceleration_y +
               m.acceleration_z * m.acceleration_z
       )                                                                                               AS acceleration_total,

       -- Angles of inclination (degrees)
       DEGREES(ACOS(
               m.acceleration_x / NULLIF(SQRT(
                                                 m.acceleration_x * m.acceleration_x +
                                                 m.acceleration_y * m.acceleration_y +
                                                 m.acceleration_z * m.acceleration_z
                                         ), 0)
               ))                                                                                      AS acceleration_angle_x,

       DEGREES(ACOS(
               m.acceleration_y / NULLIF(SQRT(
                                                 m.acceleration_x * m.acceleration_x +
                                                 m.acceleration_y * m.acceleration_y +
                                                 m.acceleration_z * m.acceleration_z
                                         ), 0)
               ))                                                                                      AS acceleration_angle_y,

       DEGREES(ACOS(
               m.acceleration_z / NULLIF(SQRT(
                                                 m.acceleration_x * m.acceleration_x +
                                                 m.acceleration_y * m.acceleration_y +
                                                 m.acceleration_z * m.acceleration_z
                                         ), 0)
               ))                                                                                      AS acceleration_angle_z,

       -- Battery percentage — CR2477 discharge curve (linear segments)
       CASE
           WHEN m.battery_voltage >= 3.0 THEN 100.0
           WHEN m.battery_voltage >= 2.9 THEN 75.0 + (m.battery_voltage - 2.9) / (3.0 - 2.9) * 25.0
           WHEN m.battery_voltage >= 2.7 THEN 50.0 + (m.battery_voltage - 2.7) / (2.9 - 2.7) * 25.0
           WHEN m.battery_voltage >= 2.5 THEN 25.0 + (m.battery_voltage - 2.5) / (2.7 - 2.5) * 25.0
           WHEN m.battery_voltage >= 2.0 THEN (m.battery_voltage - 2.0) / (2.5 - 2.0) * 25.0
           ELSE 0.0
           END                                                                                         AS battery_percentage
FROM measurements m
         INNER JOIN sensors s ON s.id = m.sensor_fk
         INNER JOIN gateways g ON g.id = m.gateway_fk;

-- ─────────────────────────────────────────────────────────────
-- View: latest metric calculated by sensor
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW latest_measurements AS
SELECT mc.*
FROM measurements_calculated mc
         INNER JOIN (SELECT sensor_fk,
                            MAX(ts) AS max_ts
                     FROM measurements
                     GROUP BY sensor_fk) latest ON mc.sensor_fk = latest.sensor_fk AND
                                                   mc.ts = latest.max_ts;

CREATE OR REPLACE VIEW measurements_hourly_calculated AS
SELECT mh.*, s.sensor_mac, s.sensor_name, g.gw_mac, g.gateway_name
FROM measurements_hourly mh
         INNER JOIN sensors s ON s.id = mh.sensor_fk
         INNER JOIN gateways g ON g.id = mh.gateway_fk;
