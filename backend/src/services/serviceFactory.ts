import { Pool } from "pg";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { createClient, RedisClientType } from "redis";
import { LoginService } from "./LoginService";
import { DataSource } from "typeorm";
import { DatabaseService } from "./DatabaseService";

// Singleton instances for production use
let pgPoolInstance: Pool | null = null;
let cacheClientInstance: RedisClientType | null = null;
let loginServiceInstance: LoginService | null = null;

// Initialize S3 client
function getS3Client(): S3Client {
  if (process.env.ENVIRONMENT === "local") {
    return new S3Client({
      region: process.env.AWS_REGION || "us-west-2",
      credentials: {
        accessKeyId: "LOCAL",
        secretAccessKey: "LOCAL",
      },
      endpoint: "http://host.docker.internal:4566",
      forcePathStyle: true,
    });
  } else {
    return new S3Client({
      region: process.env.AWS_REGION || "us-west-2",
    });
  }
}

// Initialize SQS client
export function getSQSClient(): SQSClient {
  if (process.env.ENVIRONMENT === "local") {
    return new SQSClient({
      region: process.env.AWS_REGION || "us-west-2",
      credentials: {
        accessKeyId: "LOCAL",
        secretAccessKey: "LOCAL",
      },
      endpoint: "http://host.docker.internal:4566",
    });
  } else {
    return new SQSClient({
      region: process.env.AWS_REGION || "us-west-2",
    });
  }
}

function getCacheClient(): RedisClientType {
  if (!cacheClientInstance) {
    cacheClientInstance = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      socket: {
        tls: process.env.REDIS_TLS_ENABLED === "true",
        rejectUnauthorized: process.env.REDIS_TLS_ENABLED === "true",
      },
    });

    cacheClientInstance.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    cacheClientInstance.on("connect", () => {
      console.log("Redis client connected successfully");
    });

    cacheClientInstance.on("disconnect", () => {
      console.log("Redis client disconnected");
    });
  }
  return cacheClientInstance;
}

async function ensureRedisConnection(): Promise<void> {
  const client = getCacheClient();
  if (!client.isOpen) {
    try {
      await client.connect();
      console.log("Connected to Redis successfully");
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      throw error;
    }
  }
}

// Initialize PG Pool
function getPgPool(): Pool {
  if (!pgPoolInstance) {
    const isLocal =
      process.env.DB_HOST === "localhost" ||
      process.env.DB_HOST === "127.0.0.1" ||
      process.env.DB_HOST === "host.docker.internal" ||
      process.env.DB_HOST === "postgres";

    pgPoolInstance = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: !isLocal ? { rejectUnauthorized: false } : false,
      max: 5,
      min: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      query_timeout: 60000 * 5,
    });
  }

  return pgPoolInstance;
}

async function getDataSource(): Promise<DataSource> {
  return await new DatabaseService().getDataSource();
}

export async function getLoginService(): Promise<LoginService> {
  if (!loginServiceInstance) {
    loginServiceInstance = new LoginService();
  }
  return loginServiceInstance;
}
