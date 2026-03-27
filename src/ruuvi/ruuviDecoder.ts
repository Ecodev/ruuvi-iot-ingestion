import advlib from 'advlib-ble-manufacturers';
import { config } from '../config/env.js';
import { logger } from '../logger/logger.js';
const { processManufacturerSpecificData } = advlib;
export function decodeRuuvi(manufacturerData: string) {
  if (!manufacturerData || manufacturerData.length < 48) {
    logger.warn({ manufacturerData }, 'Incomplete Ruuvi packet');
    return null;
  }
  try {
    const decoded = processManufacturerSpecificData(config.companyCode, manufacturerData);
    const format = parseInt(manufacturerData.substring(0, 2), 16);
    if (!decoded) return null;
    return {
      temperature: decoded.temperature,
      humidity: decoded.relativeHumidity,
      pressure: decoded.pressure,
      accelerationX: decoded.acceleration?.[0],
      accelerationY: decoded.acceleration?.[1],
      accelerationZ: decoded.acceleration?.[2],
      batteryVoltage: decoded.batteryVoltage,
      txPower: decoded.txPower,
      movementCounter: decoded.isMotionDetectedCycle,
      measurementSequenceNumber: decoded.txCycle,
      dataFormat: format,
    };
  } catch (err) {
    logger.warn({ err }, 'Ruuvi decode failed');
    return null;
  }
}
