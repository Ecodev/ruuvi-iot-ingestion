import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { config } from "../config/env.js";
import { register, collectDefaultMetrics } from "prom-client";
import path from 'path';
import fs from 'fs';
import { logger } from '../logger/logger.js';
import { GatewayConfigurationSchema } from '../ruuvi/gatewayConfigurationSchema.js';
const GW_CONFIG_DIR = path.resolve('config/gw_cfg');
export async function startHttpServer() {
  const fastify = Fastify();
  // Protection against brute-force or DoS attacks
  await fastify.register(rateLimit, {
    max: 100, // 100 requests
    timeWindow: '1 minute',
  });
  // Authentication on all routes except /ruuvi-gw-cfg, which uses Basic/Bearer
  fastify.addHook('onRequest', async (req, reply) => {
    if (req.url?.startsWith('/ruuvi-gw-cfg')) return; // separate authorization below
    if (req.headers['x-api-key'] !== config.httpApiKey) {
      reply.code(401).send();
    }
  });
  collectDefaultMetrics();
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });
  fastify.get('/metrics', async (_, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  // Automatic configuration endpoint for Ruuvi Gateways
  fastify.get('/ruuvi-gw-cfg', async (req, reply) => {
    // Basic authentication check (username/password from .env)
    const authHeader = req.headers['authorization'] ?? '';
    const valid = validateGwCfgAuth(authHeader);
    if (!valid) {
      reply.header('WWW-Authenticate', 'Basic realm="Ruuvi Gateway Config"');
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Resolving the configuration file based on the gateway’s MAC address
    const gwMac = (req.headers['ruuvi_gw_mac'] as string | undefined)?.toUpperCase().replace(/[^A-F0-9:]/g, '');

    let cfgPath = path.join(GW_CONFIG_DIR, 'gw_cfg.json'); // fallback

    if (gwMac) {
      const specificPath = path.join(GW_CONFIG_DIR, `${gwMac}.json`);
      if (fs.existsSync(specificPath)) {
        cfgPath = specificPath;
        logger.info({ gwMac }, 'Gateway config: serving specific config');
      } else {
        logger.info({ gwMac }, 'Gateway config: falling back to default');
      }
    }

    try {
      const raw = fs.readFileSync(cfgPath, 'utf-8');
      const configData = JSON.parse(raw);
      const validationResult = GatewayConfigurationSchema.safeParse(configData);
      if (!validationResult.success) {
        logger.error({ cfgPath, errors: validationResult.error.errors }, 'Gateway config validation failed');
        return reply.code(500).send({ error: 'Invalid config' });
      }
      reply.header('Content-Type', 'application/json');
      return reply.send(raw);
    } catch (err) {
      logger.error({ err, cfgPath }, 'Gateway config file read failed');
      return reply.code(500).send({ error: 'Config not found' });
    }
  });
  await fastify.listen({ port: config.httpPort, host: '0.0.0.0' });
  logger.info(`HTTP server listening on :${config.httpPort}`);
}

function validateGwCfgAuth(authHeader: string): boolean {
  if (!authHeader) return false;

  // Bearer token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return token === config.gwCfg.bearerToken;
  }

  // Basic auth
  if (authHeader.startsWith('Basic ')) {
    const b64 = authHeader.slice(6);
    const decoded = Buffer.from(b64, 'base64').toString('utf-8');
    const [user, pass] = decoded.split(':');
    return user === config.gwCfg.user && pass === config.gwCfg.password;
  }
  return false;
}
