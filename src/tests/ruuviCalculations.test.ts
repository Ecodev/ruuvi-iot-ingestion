import {
  equilibriumVaporPressure,
  dewPoint,
  frostPoint,
  absoluteHumidity,
  airDensity,
  accelerationTotal,
  vaporPressureDeficit,
  accelerationAngles,
  batteryPercentage,
} from '../ruuvi/ruuviCalculations.js';

describe('Ruuvi Calculations', () => {
  describe('equilibriumVaporPressure', () => {
    it('should calculate vapor pressure correctly at 20°C', () => {
      const result = equilibriumVaporPressure(20);
      expect(result).toBeCloseTo(2334, 0);
    });

    it('should calculate vapor pressure correctly at 0°C', () => {
      const result = equilibriumVaporPressure(0);
      expect(result).toBeCloseTo(611.2, 0);
    });
  });

  describe('dewPoint', () => {
    it('should calculate dew point correctly for 20°C and 60% humidity', () => {
      const result = dewPoint(20, 60);
      expect(result).toBeCloseTo(11.9, 0);
    });

    it('should return lower values with lower humidity', () => {
      const high = dewPoint(20, 80);
      const low = dewPoint(20, 40);
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('frostPoint', () => {
    it('should return same as dewPoint when temperature >= 0', () => {
      const dew = dewPoint(20, 60);
      const frost = frostPoint(20, 60);
      expect(frost).toBeCloseTo(dew, 1);
    });

    it('should calculate frost point correctly for negative temperatures', () => {
      const result = frostPoint(-10, 80);
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });
  });

  describe('absoluteHumidity', () => {
    it('should calculate absolute humidity correctly', () => {
      const result = absoluteHumidity(20, 60);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(20); // reasonable range for indoor conditions
    });

    it('should increase with temperature for same relative humidity', () => {
      const cool = absoluteHumidity(10, 60);
      const warm = absoluteHumidity(20, 60);
      expect(warm).toBeGreaterThan(cool);
    });
  });

  describe('airDensity', () => {
    it('should calculate air density at sea level correctly', () => {
      // At sea level (101325 Pa), 15°C, 0% humidity
      const result = airDensity(15, 101325, 0);
      expect(result).toBeCloseTo(1.225, 2);
    });

    it('should decrease with temperature increase', () => {
      const cool = airDensity(10, 101325, 50);
      const warm = airDensity(20, 101325, 50);
      expect(cool).toBeGreaterThan(warm);
    });
  });

  describe('accelerationTotal', () => {
    it('should calculate magnitude of acceleration vector', () => {
      const result = accelerationTotal(3, 4, 0);
      expect(result).toBeCloseTo(5, 2);
    });

    it('should return 0 for zero vector', () => {
      const result = accelerationTotal(0, 0, 0);
      expect(result).toBe(0);
    });
  });

  describe('vaporPressureDeficit', () => {
    it('should calculate VPD correctly', () => {
      const result = vaporPressureDeficit(20, 60);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    it('should increase as humidity decreases', () => {
      const humid = vaporPressureDeficit(20, 80);
      const dry = vaporPressureDeficit(20, 40);
      expect(dry).toBeGreaterThan(humid);
    });
  });

  describe('accelerationAngles', () => {
    it('should calculate angles correctly for 3-4-5 triangle', () => {
      const result = accelerationAngles(3, 4, 0);
      expect(result.angleFromX).toBeCloseTo(53.13, 1);
      expect(result.angleFromY).toBeCloseTo(36.87, 1);
    });

    it('should return NaN for zero vector', () => {
      const result = accelerationAngles(0, 0, 0);
      expect(Number.isNaN(result.angleFromX)).toBe(true);
      expect(Number.isNaN(result.angleFromY)).toBe(true);
      expect(Number.isNaN(result.angleFromZ)).toBe(true);
    });
  });

  describe('batteryPercentage', () => {
    it('should return 100% for 3.0V and above', () => {
      expect(batteryPercentage(3.0)).toBe(100);
      expect(batteryPercentage(3.1)).toBe(100);
    });

    it('should return 0% for 2.0V and below', () => {
      expect(batteryPercentage(2.0)).toBeLessThanOrEqual(1);
      expect(batteryPercentage(1.9)).toBe(0);
    });

    it('should return values between 0 and 100', () => {
      for (let v = 2.0; v <= 3.0; v += 0.1) {
        const result = batteryPercentage(v);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100);
      }
    });
  });
});
