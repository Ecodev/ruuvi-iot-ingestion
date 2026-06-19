import fs from 'fs';
import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config({ path: 'config/.env' });

function toBoolean(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

const configSchema = z.object({
  mqtt: z.object({
    protocol: z.string(),
    host: z.string(),
    port: z.number(),
    topic: z.string(),
    username: z.string().optional(),
    password: z.string().optional(),
    ca: z.instanceof(Buffer).optional(),
    cert: z.instanceof(Buffer).optional(),
    key: z.instanceof(Buffer).optional(),
    rejectUnauthorized: z.boolean(),
    timestampOffsetSeconds: z.number(),
  }),
  maria: z.object({
    host: z.string(),
    port: z.number(),
    user: z.string(),
    password: z.string(),
    database: z.string(),
  }),
  mariaBufferSize: z.number(),
  flushInterval: z.number(),
  httpPort: z.number(),
  httpApiKey: z.string().min(1),
});

export const config = configSchema.parse({
  mqtt: {
    protocol: process.env.MQTT_PROTOCOL ?? 'mqtt',
    host: process.env.MQTT_HOST ?? 'localhost',
    port: Number(process.env.MQTT_PORT ?? 1883),
    topic: process.env.MQTT_TOPIC ?? 'ruuvi/#',
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    ca: process.env.MQTT_CA ? fs.readFileSync(process.env.MQTT_CA) : undefined,
    cert: process.env.MQTT_CERT ? fs.readFileSync(process.env.MQTT_CERT) : undefined,
    key: process.env.MQTT_KEY ? fs.readFileSync(process.env.MQTT_KEY) : undefined,
    rejectUnauthorized: toBoolean(process.env.MQTT_REJECT_UNAUTHORIZED),
    timestampOffsetSeconds: Number(process.env.MQTT_TIMESTAMP_OFFSET_SECONDS ?? 0),
  },
  maria: {
    host: process.env.MARIA_HOST ?? 'localhost',
    port: Number(process.env.MARIA_PORT ?? 3306),
    user: process.env.MARIA_USER ?? 'ruuvi',
    password: process.env.MARIA_PASSWORD ?? '',
    database: process.env.MARIA_DATABASE ?? 'ruuvi',
  },
  mariaBufferSize: Number(process.env.MARIA_BUFFER_SIZE ?? 100),
  flushInterval: Number(process.env.FLUSH_INTERVAL ?? 5000),
  httpPort: Number(process.env.HTTP_PORT ?? 3002),
  httpApiKey: process.env.HTTP_API_KEY!,
});
