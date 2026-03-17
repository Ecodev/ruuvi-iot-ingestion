export class RuuviData {
  // Raw RuuviTag metrics
  temperature?: number;
  humidity?: number;
  pressure?: number;
  accelerationX?: number;
  accelerationY?: number;
  accelerationZ?: number;
  batteryVoltage?: number;
  txPower?: number;
  movementCounter?: number;
  measurementSequenceNumber?: number;
  dataFormat?: number;

  // Calculated derived fields
  absoluteHumidity?: number;
  equilibriumVaporPressure?: number;
  airDensity?: number;
  accelerationTotal?: number;
  accelerationAngleFromX?: number;
  accelerationAngleFromY?: number;
  accelerationAngleFromZ?: number;
  dewPoint?: number;
  frostPoint?: number;
  vaporPressureDeficit?: number;
  // Batterie
  batteryPercentage?: number;
  batteryLow?: boolean;

  constructor(
    public coordinates: string,
    public deviceId: string,
    public deviceName: string,
    public gatewayId: string,
    public gatewayName: string,
    public providerId: string,
    public rawData: string,
    public rssi: number | undefined,
    public timestamp: number,
  ) {}
}
