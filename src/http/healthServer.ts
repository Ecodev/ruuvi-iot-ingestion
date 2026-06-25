import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { config } from '../config/env.js';
import { register, collectDefaultMetrics } from 'prom-client';
import { logger } from '../logger/logger.js';
import { getGatewayRow, validateGatewayAuth, buildGwCfgJson } from '../maria-db/gatewayConfigService.js';
import { getMariaPool } from '../maria-db/mariaDbService.js';
import { RowDataPacket } from 'mysql2';

function normalizeMac(mac?: string): string | undefined {
  if (!mac) return undefined;
  const stripped = mac.toUpperCase().replace(/[^A-F0-9]/g, '');
  if (stripped.length !== 12) return undefined;
  return stripped.match(/.{1,2}/g)!.join(':');
}

function resolveMacFromRequest(req: FastifyRequest): string | undefined {
  const headerMac = normalizeMac((req.headers['ruuvi_gw_mac'] as string) || (req.headers['ruuvi-gw-mac'] as string));
  if (headerMac) return headerMac;

  const urlSegment = (req.params as Record<string, string>)['*'] ?? '';
  if (urlSegment.endsWith('.json')) {
    const potentialMac = normalizeMac(urlSegment.replace('.json', ''));
    if (potentialMac) return potentialMac;
  }
  return undefined;
}

export async function getSingleGatewayId(): Promise<string | null> {
  const [rows] = await getMariaPool().query<RowDataPacket[]>(
    `SELECT gateway_mac FROM gateways WHERE remote_cfg_use = 1 LIMIT 2`,
  );
  if (rows.length === 1) return rows[0].gateway_mac as string;
  return null;
}
async function handleGwCfg(req: FastifyRequest, reply: FastifyReply) {
  let mac = resolveMacFromRequest(req);

  if (!mac) {
    const fallback = await getSingleGatewayId();
    if (fallback) {
      logger.info({ fallback }, 'No MAC in request - using single registered gateway as fallback');
      mac = fallback;
    }
  }

  if (!mac) {
    logger.warn({ url: req.url }, 'GW cfg request without resolvable MAC');
    return reply.code(400).send({ error: 'Gateway MAC required (ruuvi_gw_mac header or /ruuvi-gw-cfg/<MAC>.json)' });
  }

  const row = await getGatewayRow(mac);
  if (!row) {
    logger.warn({ mac }, 'GW cfg requested for unknown gateway - provision it in the gateways table first');
    return reply.code(404).send({ error: 'Gateway not registered' });
  }

  if (!validateGatewayAuth(row, req.headers['authorization'] ?? '')) {
    reply.header('WWW-Authenticate', 'Basic realm="Ruuvi Gateway Config"');
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const remoteCfgUrl = `${req.protocol}://${req.hostname}/ruuvi-gw-cfg`;

  try {
    const cfg = buildGwCfgJson(row, remoteCfgUrl);
    reply.header('Content-Type', 'application/json');
    return reply.send(JSON.stringify(cfg));
  } catch (err) {
    logger.error({ err, mac }, 'Failed to build gateway config');
    return reply.code(500).send({ error: 'Invalid gateway configuration' });
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

  fastify.get('/ruuvi-gw-cfg', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    handler: handleGwCfg,
  });
  fastify.get('/ruuvi-gw-cfg/*', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    handler: handleGwCfg,
  });

  await fastify.listen({ port: config.httpPort, host: '0.0.0.0' });
  logger.info(`HTTP server listening on :${config.httpPort}`);
}
