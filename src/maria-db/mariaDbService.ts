import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { config } from '../config/env.js';
import { logger } from '../logger/logger.js';
import { RuuviData } from '../ruuvi/ruuviData.js';
import path from 'path';
import fs from 'fs';

let pool: Pool;

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
const INSERT_SQL = `
  INSERT INTO measurements (
    ts, device_id, device_name, gateway_id, gateway_name, rssi,
    temperature, humidity, pressure,
    acceleration_x, acceleration_y, acceleration_z,
    battery_voltage, tx_power, movement_counter,
    measurement_sequence_number, data_format
  ) VALUES ?
`;

function toRow(d: RuuviData): (number | string | null)[] {
  const ts = new Date(d.timestamp).toISOString().replace('T', ' ').replace('Z', '');
  return [
    ts,
    d.deviceId,
    d.deviceName,
    d.gatewayId,
    d.gatewayName,
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
  ];
}

export async function writeBatch(samples: RuuviData[]): Promise<void> {
  if (!samples.length) return;
  const rows = samples.map(toRow);
  let conn: PoolConnection | undefined;
  try {
    conn = await getMariaPool().getConnection();
    await conn.query(INSERT_SQL, [rows]); // Multi-row INSERT in a single query
    logger.debug({ count: rows.length }, 'MariaDB batch written');
  } catch (err) {
    logger.error({ err }, 'MariaDB write failed');
  } finally {
    conn?.release();
  }
}
