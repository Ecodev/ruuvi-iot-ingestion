import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { config } from '../config/env.js';
import { register, collectDefaultMetrics } from 'prom-client';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../logger/logger.js';
import { GatewayConfigurationSchema } from '../ruuvi/gatewayConfigurationSchema.js';

const GW_CONFIG_DIR = path.resolve('config/gw_cfg');

function resolveCfgPath(fileBase: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(fileBase)) return null;
  const resolved = path.resolve(GW_CONFIG_DIR, `${fileBase}.json`);
  const rootWithSep = GW_CONFIG_DIR.endsWith(path.sep) ? GW_CONFIG_DIR : `${GW_CONFIG_DIR}${path.sep}`;
  if (!resolved.startsWith(rootWithSep)) return null;
  return resolved;
}

function normalizeMac(mac?: string): string | undefined {
  if (!mac) return undefined;
  return mac.toUpperCase().replace(/[^A-F0-9]/g, '');
}
function normalizeMacMap(macMap: Record<string, string>): Record<string, string> {
  if (!macMap) return {};
  try {
    const normalized: Record<string, string> = {};
    for (const [mac, name] of Object.entries(macMap)) {
      const key = normalizeMac(mac);
      if (!key) continue;
      normalized[key] = name;
    }
    return normalized;
  } catch {
    logger.error(`Failed to normalize MAC map: ${JSON.stringify(macMap)}`);
    return {};
  }
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function validateGwCfgAuth(authHeader: string): boolean {
  if (!authHeader) return false;
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7) === config.gwCfg.bearerToken;
  }
  if (authHeader.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
    const [user, pass] = decoded.split(':');
    return user === config.gwCfg.user && pass === config.gwCfg.password;
  }
  return false;
}

async function handleGwCfg(req: FastifyRequest, reply: FastifyReply) {
  if (!validateGwCfgAuth(req.headers['authorization'] ?? '')) {
    reply.header('WWW-Authenticate', 'Basic realm="Ruuvi Gateway Config"');
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  // MAC resolution — from the header or from the URL if it's a MAC
  const headerMac = normalizeMac((req.headers['ruuvi_gw_mac'] as string) || (req.headers['ruuvi-gw-mac'] as string));

  // Extract the MAC from the URL if the gateway is /ruuvi-gw-cfg/F32DEFE72E78.json
  const urlSegment = (req.params as Record<string, string>)['*'] ?? '';
  let urlMac: string | undefined;
  let urlName: string | undefined;
  if (urlSegment.endsWith('.json')) {
    const potentialMac = normalizeMac(urlSegment.replace('.json', ''));
    if (potentialMac && /^[A-F0-9]{12}$/.test(potentialMac)) {
      urlMac = potentialMac;
    } else {
      urlName = urlSegment.replace('.json', '');
    }
  }

  const mac = headerMac ?? urlMac;

  logger.info({ mac, headerMac, urlMac, urlName, url: req.url }, 'GW cfg request');

  // File resolution: name → MAC → fallback
  let cfgPath = path.join(GW_CONFIG_DIR, 'gw_cfg.json');

  if (mac) {
    const gatewayName = normalizeMacMap(config.gatewayNames)[mac];

    if (gatewayName) {
      const namePath = path.join(GW_CONFIG_DIR, `${gatewayName.replace(/\s+/g, '-').toLowerCase()}.json`);
      if (await fileExists(namePath)) {
        cfgPath = namePath;
        logger.info({ mac, cfgPath }, 'Config resolved by name');
      }
    }

    if (cfgPath === path.join(GW_CONFIG_DIR, 'gw_cfg.json')) {
      const macPath = resolveCfgPath(mac);
      if (macPath && (await fileExists(macPath))) {
        cfgPath = macPath;
        logger.info({ mac, cfgPath }, 'Config resolved by MAC');
      }
    }
  } else if (urlName) {
    const namePath = resolveCfgPath(urlName);
    if (namePath && (await fileExists(namePath))) {
      cfgPath = namePath;
      logger.info({ urlName, cfgPath }, 'Config resolved by URL name');
    } else if (!namePath) {
      logger.warn({ urlName }, 'Rejected invalid GW config name');
    }
  }

  if (!(await fileExists(cfgPath))) {
    logger.error({ cfgPath }, 'Config file not found');
    return reply.code(404).send({ error: 'Config not found' });
  }

  const raw = await fs.readFile(cfgPath, 'utf-8');
  const parsed = safeJsonParse(raw);

  if (!parsed) {
    logger.error({ cfgPath }, 'Invalid JSON in config file');
    return reply.code(500).send({ error: 'Invalid JSON' });
  }

  const validation = GatewayConfigurationSchema.safeParse(parsed);
  if (!validation.success) {
    logger.error({ cfgPath, errors: validation.error.errors }, 'Schema validation failed');
    return reply.code(500).send({ error: 'Invalid config schema' });
  }

  // Add HTTP-specific fields as per schema
  if (mac && !parsed.gw_mac) {
    parsed.gw_mac = mac;
  }
  // Other fields like fw_ver, nrf52_fw_ver, storage can be added if needed, but optional

  reply.header('Content-Type', 'application/json');
  return reply.send(JSON.stringify(parsed));
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function startHttpServer() {
  const fastify = Fastify();

  await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await fastify.register(helmet);

  fastify.addHook('onRequest', async (req, reply) => {
    if (req.url?.startsWith('/ruuvi-gw-cfg')) return;
    if (req.headers['x-api-key'] !== config.httpApiKey) {
      reply.code(401).send();
    }
  });

  collectDefaultMetrics();

  fastify.get('/health', async () => ({ status: 'ok' }));

  fastify.get('/metrics', async (_, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  // Both routes point to the same handler, which will resolve the config based on headers or URL
  fastify.get('/ruuvi-gw-cfg', {
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
    handler: handleGwCfg,
  });
  fastify.get('/ruuvi-gw-cfg/*', {
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
    handler: handleGwCfg,
  });

  await fastify.listen({ port: config.httpPort, host: '0.0.0.0' });
  logger.info(`HTTP server listening on :${config.httpPort}`);
}
