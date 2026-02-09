// AWS SDK configuration with LocalStack support
// Set USE_LOCALSTACK=true to route all AWS calls to LocalStack
//
// Usage:
//   import { getAwsConfig, getEndpoint } from "@/lib/aws-config";
//   const client = new S3Client(getAwsConfig());

export interface AwsConfig {
  region: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  forcePathStyle?: boolean; // For S3 with LocalStack
}

const LOCALSTACK_ENDPOINT =
  process.env.LOCALSTACK_ENDPOINT ?? "http://localhost:4566";

export function isLocalStack(): boolean {
  return process.env.USE_LOCALSTACK === "true";
}

export function getEndpoint(): string | undefined {
  return isLocalStack() ? LOCALSTACK_ENDPOINT : undefined;
}

export function getAwsConfig(): AwsConfig {
  const config: AwsConfig = {
    region: process.env.AWS_REGION ?? "us-east-1",
  };

  if (isLocalStack()) {
    config.endpoint = LOCALSTACK_ENDPOINT;
    config.credentials = {
      accessKeyId: "test",
      secretAccessKey: "test",
    };
    config.forcePathStyle = true; // Required for S3 with LocalStack
  }

  return config;
}

// Database config — uses Secrets Manager in prod, env vars with LocalStack
export function getDbConfig() {
  if (isLocalStack()) {
    return {
      host: process.env.DB_HOST ?? "localhost",
      port: parseInt(process.env.DB_PORT ?? "5432"),
      user: process.env.DB_USER ?? "chatdev",
      password: process.env.DB_PASSWORD ?? "localdev123",
      database: process.env.DB_NAME ?? "portfolio_chat",
      ssl: false,
    };
  }

  // Production: credentials come from Secrets Manager via RDS Proxy IAM auth
  return {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT ?? "5432"),
    user: process.env.DB_USER!,
    database: process.env.DB_NAME ?? "portfolio_chat",
    ssl: { rejectUnauthorized: true },
    // IAM auth token is generated at connection time
  };
}
