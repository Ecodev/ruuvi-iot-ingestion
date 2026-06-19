import { RowDataPacket } from 'mysql2';
import { getMariaPool } from './mariaDbService.js';

export interface Settings {
  mariaRetentionEnabled: boolean;
  mariaRetentionDays: number;
  mariaDownsampleEnabled: boolean;
  mariaDownsampleRetentionDays: number;
  mariaDownsampleDeleteRaw: boolean;
  mariaMaintenanceIntervalHours: number;
}

interface SettingsRow extends RowDataPacket {
  maria_retention_enabled: number;
  maria_retention_days: number;
  maria_downsample_enabled: number;
  maria_downsample_retention_days: number;
  maria_downsample_delete_raw: number;
  maria_maintenance_interval_hours: number;
}

export async function getSettings(): Promise<Settings> {
  const [rows] = await getMariaPool().query<SettingsRow[]>(`SELECT * FROM settings WHERE id = 1`);
  const row = rows[0];
  if (!row) {
    throw new Error('settings row missing — did initMariaSchema() run?');
  }
  return {
    mariaRetentionEnabled: !!row.maria_retention_enabled,
    mariaRetentionDays: row.maria_retention_days,
    mariaDownsampleEnabled: !!row.maria_downsample_enabled,
    mariaDownsampleRetentionDays: row.maria_downsample_retention_days,
    mariaDownsampleDeleteRaw: !!row.maria_downsample_delete_raw,
    mariaMaintenanceIntervalHours: row.maria_maintenance_interval_hours,
  };
}
