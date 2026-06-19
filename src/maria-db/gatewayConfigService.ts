import { RowDataPacket } from 'mysql2';
import { getMariaPool } from './mariaDbService.js';
import { logger } from '../logger/logger.js';
import { GatewayConfigurationSchema } from '../ruuvi/gatewayConfigurationSchema.js';

interface GatewayRow extends RowDataPacket {
  gw_mac: string;
  gateway_name: string;
  gw_cfg_user: string | null;
  gw_cfg_password: string | null;
  gw_cfg_bearer_token: string | null;
  remote_cfg_use: number;
  remote_cfg_auth_type: string;
  remote_cfg_refresh_interval_minutes: number;
  use_eth: number;
  eth_dhcp: number;
  wifi_sta_ssid: string;
  wifi_sta_password: string;
  use_http_ruuvi: number;
  use_http: number;
  use_mqtt: number;
  mqtt_disable_retained_messages: number;
  mqtt_transport: string;
  mqtt_data_format: string;
  mqtt_server: string;
  mqtt_port: number;
  mqtt_sending_interval: number;
  mqtt_user: string;
  mqtt_use_ssl_client_cert: number;
  mqtt_use_ssl_server_cert: number;
  lan_auth_type: string;
  lan_auth_user: string;
  lan_auth_api_key_use: number;
  lan_auth_api_key: string;
  lan_auth_api_key_rw_use: number;
  lan_auth_api_key_rw: string;
  auto_update_cycle: string;
  auto_update_weekdays_bitmask: number;
  auto_update_interval_from: number;
  auto_update_interval_to: number;
  auto_update_tz_offset_hours: number;
  ntp_use: number;
  ntp_use_dhcp: number;
  ntp_server1: string;
  ntp_server2: string;
  ntp_server3: string;
  ntp_server4: string;
  company_id: number;
  company_use_filtering: number;
  scan_coded_phy: number;
  scan_1mbit_phy: number;
  scan_2mbit_phy: number;
  scan_extended_payload: number;
  scan_channel_37: number;
  scan_channel_38: number;
  scan_channel_39: number;
  scan_filter_allow_listed: number;
  scan_filter_list: string | null; // JSON column
  coordinates: string;
  fw_update_url: string;
}

/** Formats a no-separator MAC ("F32DEFE72E78") into colon format ("F3:2D:EF:E7:2E:78") */
export function formatMac(macNoColon: string): string {
  return macNoColon.match(/.{1,2}/g)?.join(':') ?? macNoColon;
}

export async function getGatewayRow(gwMac: string): Promise<GatewayRow | null> {
  const [rows] = await getMariaPool().query<GatewayRow[]>(`SELECT * FROM gateways WHERE gw_mac = ?`, [gwMac]);
  return rows[0] ?? null;
}

export function validateGatewayAuth(row: GatewayRow, authHeader: string): boolean {
  if (!authHeader) return false;
  if (authHeader.startsWith('Bearer ')) {
    if (!row.gw_cfg_bearer_token) return false;
    return authHeader.slice(7) === row.gw_cfg_bearer_token;
  }
  if (authHeader.startsWith('Basic ')) {
    if (!row.gw_cfg_user || !row.gw_cfg_password) return false;
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
    const [user, pass] = decoded.split(':');
    return user === row.gw_cfg_user && pass === row.gw_cfg_password;
  }
  return false;
}

export function buildGwCfgJson(row: GatewayRow, remoteCfgUrl: string): unknown {
  const macColon = formatMac(row.gw_mac);

  const raw = {
    gw_mac: macColon,

    remote_cfg_use: !!row.remote_cfg_use,
    remote_cfg_url: remoteCfgUrl,
    remote_cfg_auth_type: row.remote_cfg_auth_type,
    remote_cfg_auth_basic_user: row.gw_cfg_user ?? undefined,
    remote_cfg_auth_basic_pass: row.gw_cfg_password ?? undefined,
    remote_cfg_auth_bearer_token: row.gw_cfg_bearer_token ?? undefined,
    remote_cfg_refresh_interval_minutes: row.remote_cfg_refresh_interval_minutes,

    use_eth: !!row.use_eth,
    eth_dhcp: !!row.eth_dhcp,
    wifi_sta_config: { ssid: row.wifi_sta_ssid, password: row.wifi_sta_password },

    use_http_ruuvi: !!row.use_http_ruuvi,
    use_http: !!row.use_http,

    use_mqtt: !!row.use_mqtt,
    mqtt_disable_retained_messages: !!row.mqtt_disable_retained_messages,
    mqtt_transport: row.mqtt_transport,
    mqtt_data_format: row.mqtt_data_format,
    mqtt_server: row.mqtt_server,
    mqtt_port: row.mqtt_port,
    mqtt_sending_interval: row.mqtt_sending_interval,
    mqtt_prefix: `ruuvi/${macColon}/`,
    mqtt_client_id: macColon,
    mqtt_user: row.mqtt_user,
    mqtt_use_ssl_client_cert: !!row.mqtt_use_ssl_client_cert,
    mqtt_use_ssl_server_cert: !!row.mqtt_use_ssl_server_cert,

    lan_auth_type: row.lan_auth_type,
    lan_auth_user: row.lan_auth_user,
    lan_auth_api_key_use: !!row.lan_auth_api_key_use,
    lan_auth_api_key: row.lan_auth_api_key,
    lan_auth_api_key_rw_use: !!row.lan_auth_api_key_rw_use,
    lan_auth_api_key_rw: row.lan_auth_api_key_rw,

    auto_update_cycle: row.auto_update_cycle,
    auto_update_weekdays_bitmask: row.auto_update_weekdays_bitmask,
    auto_update_interval_from: row.auto_update_interval_from,
    auto_update_interval_to: row.auto_update_interval_to,
    auto_update_tz_offset_hours: row.auto_update_tz_offset_hours,

    ntp_use: !!row.ntp_use,
    ntp_use_dhcp: !!row.ntp_use_dhcp,
    ntp_server1: row.ntp_server1,
    ntp_server2: row.ntp_server2,
    ntp_server3: row.ntp_server3,
    ntp_server4: row.ntp_server4,

    company_id: row.company_id,
    company_use_filtering: !!row.company_use_filtering,
    scan_coded_phy: !!row.scan_coded_phy,
    scan_1mbit_phy: !!row.scan_1mbit_phy,
    scan_2mbit_phy: !!row.scan_2mbit_phy,
    scan_channel_37: !!row.scan_channel_37,
    scan_channel_38: !!row.scan_channel_38,
    scan_channel_39: !!row.scan_channel_39,
    scan_filter_allow_listed: !!row.scan_filter_allow_listed,
    scan_filter_list: row.scan_filter_list ? JSON.parse(row.scan_filter_list) : [],

    coordinates: row.coordinates,
    fw_update_url: row.fw_update_url,
  };

  const validation = GatewayConfigurationSchema.safeParse(raw);
  if (!validation.success) {
    logger.error({ gwMac: row.gw_mac, errors: validation.error.errors }, 'Built gw_cfg failed schema validation');
    throw new Error('Invalid gateway configuration built from DB row');
  }
  return validation.data;
}
