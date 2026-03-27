import { z } from 'zod';

export const GatewayConfigurationSchema = z
  .object({
    fw_ver: z.string().describe('This field is generated only when configuration is requested via HTTP.').optional(),
    nrf52_fw_ver: z
      .string()
      .describe('This field is generated only when configuration is requested via HTTP.')
      .optional(),
    gw_mac: z.string().describe('This field is generated only when configuration is requested via HTTP.').optional(),
    storage: z
      .object({
        storage_ready: z.boolean(),
        http_cli_cert: z.boolean(),
        http_cli_key: z.boolean(),
        http_srv_cert: z.boolean(),
        stat_cli_cert: z.boolean(),
        stat_cli_key: z.boolean(),
        stat_srv_cert: z.boolean(),
        mqtt_cli_cert: z.boolean(),
        mqtt_cli_key: z.boolean(),
        mqtt_srv_cert: z.boolean(),
        rcfg_cli_cert: z.boolean(),
        rcfg_cli_key: z.boolean(),
        rcfg_srv_cert: z.boolean(),
      })
      .describe('This field is generated only when configuration is requested via HTTP.')
      .optional(),
    wifi_sta_config: z
      .object({ ssid: z.string(), password: z.string().optional() })
      .describe("Gateway will connect to the specified WiFi SSID if it's not empty. Note: 'use_eth' should be 'false'")
      .optional(),
    wifi_ap_config: z.object({ password: z.string().default(''), channel: z.number().int().default(1) }).optional(),
    use_eth: z.boolean().optional(),
    eth_dhcp: z.boolean().default(true),
    eth_static_ip: z.string().optional(),
    eth_netmask: z.string().optional(),
    eth_gw: z.string().optional(),
    eth_dns1: z.string().optional(),
    eth_dns2: z.string().optional(),
    remote_cfg_use: z.boolean().default(false),
    remote_cfg_url: z.string().optional(),
    remote_cfg_auth_type: z
      .string()
      .regex(new RegExp('^(|none|no|basic|bearer)$'))
      .describe("It should not be empty if 'remote_cfg_use' is 'true'")
      .default(''),
    remote_cfg_auth_bearer_token: z.string().optional(),
    remote_cfg_auth_basic_user: z.string().optional(),
    remote_cfg_auth_basic_pass: z.string().optional(),
    remote_cfg_refresh_interval_minutes: z.number().int().optional(),
    remote_cfg_use_ssl_client_cert: z.boolean().default(false),
    remote_cfg_use_ssl_server_cert: z.boolean().default(false),
    use_http_ruuvi: z.boolean().default(true),
    use_http: z.boolean().default(false),
    http_data_format: z.string().regex(new RegExp('^(|ruuvi)$')).default('ruuvi'),
    http_auth: z.string().regex(new RegExp('^(|none|basic|bearer|token)$')).default('none'),
    http_url: z.string().default('https://network.ruuvi.com/record'),
    http_period: z.number().int().default(10),
    http_user: z.string().default(''),
    http_pass: z.string().default(''),
    http_bearer_token: z.string().describe("Bearer token is used when http_auth equals to 'bearer'").default(''),
    http_api_key: z.string().describe("This API key is used when http_auth equals to 'token'").default(''),
    http_use_ssl_client_cert: z.boolean().default(false),
    http_use_ssl_server_cert: z.boolean().default(false),
    use_http_stat: z.boolean().default(true),
    http_stat_url: z.string().default('https://network.ruuvi.com/status'),
    http_stat_user: z.string().default(''),
    http_stat_pass: z.string().default(''),
    http_stat_use_ssl_client_cert: z.boolean().default(false),
    http_stat_use_ssl_server_cert: z.boolean().default(false),
    use_mqtt: z.boolean().default(false),
    mqtt_disable_retained_messages: z.boolean().default(false),
    mqtt_transport: z
      .string()
      .regex(new RegExp('^(TCP|SSL|WS|WSS)$'))
      .describe(
        'TCP - MQTT over TCP, SSL - MQTT over SSL, WS - MQTT over WebSockets, WSS - MQTT over secure WebSockets',
      )
      .default('TCP'),
    mqtt_data_format: z
      .string()
      .regex(new RegExp('^(ruuvi_raw|ruuvi_raw_and_decoded|ruuvi_decoded)$'))
      .describe(
        'ruuvi_raw - raw data only, ruuvi_raw_and_decoded - raw and decoded data, ruuvi_decoded - decoded data only',
      )
      .default('ruuvi_raw'),
    mqtt_server: z.string().optional(),
    mqtt_port: z.number().int().default(1883),
    mqtt_prefix: z
      .string()
      .describe(
        "Full MQTT topic is formed by joining the prefix and Bluetooth-sensor's MAC-address. If 'mqtt_prefix' is empty, then default prefix is used: 'ruuvi/<gateway_MAC_address>/'",
      )
      .default(''),
    mqtt_client_id: z
      .string()
      .describe("If 'mqtt_client_id' is empty, then default client ID is used: '<gateway_MAC_address>'")
      .default(''),
    mqtt_user: z.string().default(''),
    mqtt_pass: z.string().default(''),
    mqtt_use_ssl_client_cert: z.boolean().default(false),
    mqtt_use_ssl_server_cert: z.boolean().default(false),
    lan_auth_type: z
      .string()
      .regex(
        new RegExp('^(lan_auth_default|lan_auth_ruuvi|lan_auth_deny|lan_auth_allow|lan_auth_basic|lan_auth_digest)$'),
      )
      .describe(
        "'lan_auth_default' - Ruuvi-authentication with username 'Admin' and as a password the Unique ID is used (in format XX:XX:XX:XX:XX:XX:XX:XX) which is printed on the bottom of the Ruuvi Gateway. 'lan_auth_ruuvi' - Ruuvi-authentication, login/password should be specified in 'lan_auth_user' and 'lan_auth_pass'. 'lan_auth_deny' - deny access from LAN. 'lan_auth_allow' - allow access from LAN without a password. 'lan_auth_basic' - HTTP basic authentication, login/password should be specified in 'lan_auth_user' and 'lan_auth_pass'. 'lan_auth_digest' - HTTP digest authentication, login/password should be specified in 'lan_auth_user' and 'lan_auth_pass'.",
      )
      .default('lan_auth_default'),
    lan_auth_user: z.string().default('Admin'),
    lan_auth_pass: z.string().optional(),
    lan_auth_api_key_use: z
      .boolean()
      .describe(
        "This field is generated when configuration is read via HTTP ('lan_auth_api_key' is not generated in this case)",
      )
      .optional(),
    lan_auth_api_key: z
      .string()
      .describe("If 'lan_auth_api_key' is empty, then bearer authentication is disabled.")
      .default(''),
    lan_auth_api_key_rw_use: z
      .boolean()
      .describe(
        "This field is generated when configuration is read via HTTP ('lan_auth_api_key_rw' is not generated in this case)",
      )
      .optional(),
    lan_auth_api_key_rw: z
      .string()
      .describe("If 'lan_auth_api_key_rw' is empty, then bearer authentication is disabled.")
      .default(''),
    auto_update_cycle: z
      .string()
      .regex(new RegExp('^(regular|beta|manual)$'))
      .describe(
        "'regular' - check for updates 1-2 times a day according to the schedule, install new versions only 2 weeks after release. 'beta' - install new versions as soon as a new version is released. 'manual' - do not check for firmware updates and do not install updates automatically",
      )
      .default('regular'),
    auto_update_weekdays_bitmask: z
      .number()
      .int()
      .describe('Bit-mask for weekdays: bit 0 - Sunday, bit 1 - Monday, ..., bit 6 - Saturday')
      .default(127),
    auto_update_interval_from: z.number().int().describe('0 - 00:00, 1 - 01:00, 2 - 02:00, ..., 23 - 23:00').default(0),
    auto_update_interval_to: z.number().int().describe('1 - 01:00, 2 - 02:00, ..., 24 - 24:00').default(24),
    auto_update_tz_offset_hours: z.number().int().default(3),
    ntp_use: z.boolean().default(true),
    ntp_use_dhcp: z.boolean().default(false),
    ntp_server1: z.string().default('time.google.com'),
    ntp_server2: z.string().default('time.cloudflare.com'),
    ntp_server3: z.string().default('pool.ntp.org'),
    ntp_server4: z.string().default('time.ruuvi.com'),
    company_use_filtering: z.boolean().default(true),
    company_id: z.number().int().default(1177),
    scan_coded_phy: z.boolean().default(false),
    scan_1mbit_phy: z.boolean().default(true),
    scan_extended_payload: z.boolean().default(true),
    scan_channel_37: z.boolean().default(true),
    scan_channel_38: z.boolean().default(true),
    scan_channel_39: z.boolean().default(true),
    scan_filter_allow_listed: z
      .boolean()
      .describe(
        "If it's true, only the sensors in the list will pass through the filter, other sensors will be filtered out. If it's false, then all sensors will pass through the filter except those in the list.",
      )
      .default(false),
    scan_filter_list: z
      .array(z.any())
      .describe(
        'Type of filtering is set by scan_filter_allow_listed. If scan_filter_list is empty, then filtering is not active',
      )
      .default([]),
    coordinates: z.string().default(''),
    fw_update_url: z.string().default('https://network.ruuvi.com/firmwareupdate'),
  })
  .passthrough();
