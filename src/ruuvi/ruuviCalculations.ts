/**
 * Saturation vapor pressure (improved Magnus formula, in Pa)
 * Valid between -40°C and +60°C — covers the RuuviTag range well
 */
export function equilibriumVaporPressure(temperatureC: number): number {
  const a = 17.625;
  const b = 243.04; // °C
  return 611.2 * Math.exp((a * temperatureC) / (b + temperatureC));
}
/**
 * Dew point (°C) — Magnus formula
 * Valid between -40°C and +60°C
 */
export function dewPoint(temperatureC: number, relativeHumidityPct: number): number {
  const a = 17.625;
  const b = 243.04;
  const alpha = Math.log(relativeHumidityPct / 100) + (a * temperatureC) / (b + temperatureC);
  return (b * alpha) / (a - alpha);
}

/**
 * Freezing point (°C) — Alduchov & Eskridge formula
 * More accurate than dewPoint when T < 0°C (frozen surface)
 */
export function frostPoint(temperatureC: number, relativeHumidityPct: number): number {
  // Si T >= 0°C, le point de givrage == point de rosée
  if (temperatureC >= 0) return dewPoint(temperatureC, relativeHumidityPct);
  const a = 22.587;
  const b = 273.86;
  const tempK = temperatureC + 273.15;
  const alpha = Math.log(relativeHumidityPct / 100) + (a * temperatureC) / (b + temperatureC);
  return (b * alpha) / (a - alpha);
}

/**
 * Absolute humidity (g/m³)
 * Mass of water vapor per unit volume of air
 */
export function absoluteHumidity(temperatureC: number, relativeHumidityPct: number): number {
  const Rv = 461.5; // J/(kg·K) — specific heat capacity of water vapour
  const tempK = temperatureC + 273.15;
  const pv = (relativeHumidityPct / 100) * equilibriumVaporPressure(temperatureC);
  // ρv = pv / (Rv * T), to kg/m³ → converted to g/m³
  return (pv / (Rv * tempK)) * 1000;
}


/**
 * Density of humid air (kg/m³)
 * Ideal gas law with correction for water vapor
 */
export function airDensity(temperatureC: number, pressurePa: number, relativeHumidityPct: number): number {
  const Rd = 287.058; // J/(kg·K) — dry air constant
  const Rv = 461.5; // J/(kg·K) — vapour pressure
  const tempK = temperatureC + 273.15;
  const pv = (relativeHumidityPct / 100) * equilibriumVaporPressure(temperatureC);
  const pd = pressurePa - pv; // partial pressure of dry air
  return pd / (Rd * tempK) + pv / (Rv * tempK);
}

/**
 * Acceleration vector standard (g)
 */
export function accelerationTotal(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Vapor Pressure Deficit — VPD (kPa)
 * A key indicator in horticulture.
 * Ideal VPD: 0.8–1.2 kPa for most crops
 * < 0.4 kPa: risk of mould
 * > 1.6 kPa: water stress
 */
export function vaporPressureDeficit(
  temperatureC: number,
  relativeHumidityPct: number
): number {
  const evp = equilibriumVaporPressure(temperatureC); // en Pa
  const vpd = evp * (1 - relativeHumidityPct / 100);
  return vpd / 1000; // converti en kPa
}

/**
 * Angles of inclination from each axis (degrees)
 * arccos(component / norm) — returns NaN if the norm is zero
 */
export function accelerationAngles(
  x: number,
  y: number,
  z: number,
): { angleFromX: number; angleFromY: number; angleFromZ: number } {
  const total = accelerationTotal(x, y, z);
  if (total === 0) {
    return { angleFromX: NaN, angleFromY: NaN, angleFromZ: NaN };
  }
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  return {
    angleFromX: toDeg(Math.acos(x / total)),
    angleFromY: toDeg(Math.acos(y / total)),
    angleFromZ: toDeg(Math.acos(z / total)),
  };
}

/**
 * Estimated battery percentage for CR2477 (RuuviTag)
 * LiMnO2 discharge curve simplified into linear segments
 * Operating range: 2.0V – 3.0V
 */
export function batteryPercentage(voltage: number): number {
  if (voltage >= 3.0) return 100;
  if (voltage >= 2.9) return 75 + (voltage - 2.9) / (3.0 - 2.9) * 25;
  if (voltage >= 2.7) return 50 + (voltage - 2.7) / (2.9 - 2.7) * 25;
  if (voltage >= 2.5) return 25 + (voltage - 2.5) / (2.7 - 2.5) * 25;
  if (voltage >= 2.0) return (voltage - 2.0) / (2.5 - 2.0) * 25;
  return 0;
}

/**
 * Low battery flag
 * Threshold set at 2.5V — below this, readings may become unstable
 */
export function isBatteryLow(voltage: number): boolean {
  return voltage < 2.5;
}