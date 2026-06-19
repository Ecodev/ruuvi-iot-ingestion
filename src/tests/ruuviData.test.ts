import { describe, it, expect } from 'vitest';
import { RuuviData } from '../ruuvi/ruuviData.js';

describe('RuuviData', () => {
  it('should construct with required fields', () => {
    const d = new RuuviData('', 'AA:BB:CC:DD:EE:FF', 'Fridge 1', 'GW:MA:C0:00:00:01', 'Station 1', -65, 1700000000000);
    expect(d.sensorId).toBe('AA:BB:CC:DD:EE:FF');
    expect(d.sensorName).toBe('Fridge 1');
    expect(d.gwMac).toBe('GW:MA:C0:00:00:01');
    expect(d.gatewayName).toBe('Station 1');
    expect(d.timestamp).toBe(1700000000000);
    expect(d.rssi).toBe(-65);
  });

  it('should have optional metric fields undefined by default', () => {
    const d = new RuuviData('', 'AA:BB:CC:DD:EE:FF', 'Tag', 'GW', 'GW', undefined, 0);
    expect(d.temperature).toBeUndefined();
    expect(d.humidity).toBeUndefined();
    expect(d.pressure).toBeUndefined();
    expect(d.accelerationX).toBeUndefined();
    expect(d.batteryVoltage).toBeUndefined();
  });

  it('should accept metric assignment', () => {
    const d = new RuuviData('', 'AA:BB:CC:DD:EE:FF', 'Tag', 'GW', 'GW', -70, Date.now());
    d.temperature = 21.5;
    d.humidity = 55.0;
    d.pressure = 101325;
    expect(d.temperature).toBe(21.5);
    expect(d.humidity).toBe(55.0);
    expect(d.pressure).toBe(101325);
  });

  it('should accept rssi as undefined', () => {
    const d = new RuuviData('', 'AA:BB:CC:DD:EE:FF', 'Tag', 'GW', 'GW', undefined, 0);
    expect(d.rssi).toBeUndefined();
  });
});
