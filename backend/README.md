# Backend

Serverless Lambda backend with rspack bundling, TypeORM entities, and OpenAPI-driven code generation.

[Back to root](../README.md)

## Architecture

```
backend/
├── src/
│   ├── functions/          # Lambda function handlers (auto-discovered)
│   │   ├── chat-api/       # RAG chat API handler (Bedrock + S3 embeddings)
│   │   ├── db-migration/   # Database migration handler
│   │   └── login/          # Authentication handler
│   ├── generated/          # Auto-generated from OpenAPI
│   │   ├── apis/           # API client classes
│   │   ├── entities/       # TypeORM entity classes
│   │   ├── models/         # TypeScript interfaces
│   │   └── services/       # Service interfaces
│   ├── migrations/         # TypeORM migration files
│   ├── services/           # Business logic services
│   └── utils/              # Shared utilities
├── dist/                   # Bundled output (one file per Lambda)
├── rspack.config.js        # Build configuration
└── package.json
```

## Key Concepts

### Auto-Discovery of Lambda Functions

The rspack configuration automatically discovers Lambda functions by scanning `src/functions/`. Any directory with an `index.ts` file becomes a bundled Lambda:

```
src/functions/
├── chat-api/
│   └── index.ts    → dist/chat-api.js
├── login/
│   └── index.ts    → dist/login.js
└── db-migration/
    └── index.ts    → dist/db-migration.js
```

### Generated Code

Code in `src/generated/` is auto-generated from the OpenAPI spec. Do not edit these files directly - they will be overwritten when running `npm run codegen` from the project root.

| Directory | Source | Purpose |
|-----------|--------|---------|
| `generated/entities/` | OpenAPI schemas with `x-entity: true` | TypeORM entity classes |
| `generated/models/` | OpenAPI schemas | TypeScript interfaces |
| `generated/services/` | OpenAPI paths | Service interfaces |
| `generated/apis/` | OpenAPI paths | API client classes |

### Service Layer Pattern

Business logic lives in `src/services/`. Services are instantiated via `serviceFactory.ts`:

```typescript
// src/services/LoginService.ts
export class LoginService {
  // Authentication logic
}

// src/services/DatabaseService.ts
export class DatabaseService {
  // Database connection and query logic
}

// src/services/serviceFactory.ts
export function getLoginService(): LoginService {
  return new LoginService();
}
```

## Development

### Build Commands

```bash
# From project root
npm run backend:build    # One-time build
npm run backend:watch    # Watch mode for development

# From backend directory
npm run build
npm run watch
```

### Database Migrations

Migrations are TypeORM migration files in `src/migrations/`:

```bash
# Run migrations (from project root)
npm run exec:migration

# Seed database (from project root)
npm run exec:seed
```

## Adding a New Lambda Function

### Step 1: Create Function Directory

```bash
mkdir -p src/functions/my-new-api
```

### Step 2: Create Handler

```typescript
// src/functions/my-new-api/index.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ message: "Hello from my-new-api" }),
  };
};
```

### Step 3: Add to OpenAPI Spec

Add the new endpoint to `codegen/openapi.yaml`:

```yaml
paths:
  /my-endpoint:
    get:
      operationId: getMyEndpoint
      x-amazon-apigateway-integration:
        type: aws_proxy
        httpMethod: POST
        uri:
          Fn::Sub: arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${MyNewApiHandler.Arn}/invocations
```

### Step 4: Add CDK Integration

Add the Lambda to `infrastructure/lib/lambda.ts`:

```typescript
const apiIntegrationsConfig = [
  // ... existing integrations
  {
    id: "MyNewApiHandler",
    lambdaFunctionProps: {
      functionName: `${lambdaNamePrefix}-MyNewApi`,
      handler: "my-new-api.handler",
      // ... other props
    },
  },
];
```

### Step 5: Build and Deploy

```bash
npm run backend:build
npm run local:deploy  # or npm run deploy for production
```

## Bundling Configuration

The rspack configuration (`rspack.config.js`) includes:

- **SWC compiler** with TypeScript decorator support (required for TypeORM)
- **Auto-discovery** of Lambda functions in `src/functions/`
- **Asset handling** for `.sql` and `.csv` files (useful for migrations/seeds)
- **Source maps** enabled for debugging
- **AWS SDK externalization** (uses Lambda runtime's built-in SDK)

Key settings:

```javascript
module.exports = {
  target: "node",
  entry: generateLambdaEntryPoints(),  // Auto-discovers functions
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    libraryTarget: "commonjs2",
  },
  optimization: {
    minimize: false,  // Preserves TypeORM migration class names
  },
};
```

## TypeORM Configuration

TypeORM is configured for PostgreSQL with the following conventions:

- Entities are generated from OpenAPI schemas marked with `x-entity: true`
- Migrations use timestamp-prefixed naming: `YYYYMMDDHHMMSS-MigrationName.ts`
- Database connection uses environment variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

## Environment Variables

| Variable | Description | Default (Local) |
|----------|-------------|-----------------|
| `DB_HOST` | Database hostname | `host.docker.internal` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `eribertolopez` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `NODE_ENV` | Environment | `development` |
| `ENVIRONMENT` | Deployment environment | `dev` |
| `REDIS_HOST` | Redis hostname | `host.docker.internal` |
| `REDIS_PORT` | Redis port | `6379` |
