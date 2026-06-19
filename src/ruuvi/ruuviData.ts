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

  constructor(
    public coordinates: string,
    public sensorId: string,
    public sensorName: string,
    public gwMac: string,
    public gatewayName: string,
    public rssi: number | undefined,
    public timestamp: number,
  ) {}
}
