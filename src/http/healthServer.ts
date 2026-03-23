import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { config } from "../config/env.js";
import { register, collectDefaultMetrics } from "prom-client";
export async function startHttpServer() {
  const fastify = Fastify();
  // Protection against brute-force or DoS attacks
  await fastify.register(rateLimit, {
    max: 100, // 100 requests
    timeWindow: '1 minute'
  });
  fastify.addHook("onRequest", async (req, reply) => {
    if (req.headers['x-api-key'] !== config.httpApiKey) {
      reply.code(401).send();
    }
  });
  collectDefaultMetrics();
  fastify.get("/health", async () => {
    return { status: "ok" };
  });
  fastify.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", register.contentType);
    return register.metrics();
  });
  await fastify.listen({
    port: config.httpPort,
    host: "0.0.0.0"
  });
}
