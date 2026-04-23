import { describe, it, expect } from 'vitest';
import ruuviSchema from '../ruuvi/ruuviMqttDataWithTimestampsSchema.js';

const validPayload = {
  gw_mac: 'F3:2D:EF:E7:2E:78',
  rssi: -65,
  aoa: [],
  gwts: 1774824214,
  ts: 1774824210,
  data: '0201061BFF99040517F3216DB9630010FFF003E89DD60F6F9FDEC2770C314D',
  dataFormat: 5,
  temperature: 21.5,
  humidity: 55.3,
  pressure: 101325,
  accelX: 0.016,
  accelY: -0.016,
  accelZ: 1.0,
  movementCounter: 15,
  voltage: 2.862,
  txPower: 4,
  measurementSequenceNumber: 28575,
  id: 'DE:C2:77:0C:31:4D',
  coords: '',
};

describe('ruuviMqttDataWithTimestampsSchema', () => {
  it('should accept a valid full payload', () => {
    const result = ruuviSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should accept a payload with only the data field', () => {
    const result = ruuviSchema.safeParse({ data: 'AABBCC' });
    expect(result.success).toBe(true);
  });

  it('should accept payload without optional fields', () => {
    const result = ruuviSchema.safeParse({ aoa: [] });
    expect(result.success).toBe(true);
  });

  it('should coerce string ts to number', () => {
    const result = ruuviSchema.safeParse({ ...validPayload, ts: '1774824210' });
    expect(result.success).toBe(true);
    if (result.success) expect(typeof result.data.ts).toBe('number');
  });

  it('should coerce string gwts to number', () => {
    const result = ruuviSchema.safeParse({ ...validPayload, gwts: '1774824214' });
    expect(result.success).toBe(true);
    if (result.success) expect(typeof result.data.gwts).toBe('number');
  });

  it('should reject invalid gw_mac format', () => {
    const result = ruuviSchema.safeParse({ ...validPayload, gw_mac: 'not-a-mac' });
    expect(result.success).toBe(false);
  });

  it('should default aoa to empty array when missing', () => {
    const result = ruuviSchema.safeParse({ data: 'AABBCC' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.aoa).toEqual([]);
  });

  it('should accept negative rssi values', () => {
    const result = ruuviSchema.safeParse({ ...validPayload, rssi: -90 });
    expect(result.success).toBe(true);
  });

  it('should accept negative temperature', () => {
    const result = ruuviSchema.safeParse({ ...validPayload, temperature: -25.5 });
    expect(result.success).toBe(true);
  });
});
