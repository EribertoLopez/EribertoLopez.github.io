# AWS Migration Plan — Full AWS Deployment

> **Goal:** Migrate from GitHub Pages + Vercel (planned) to a fully AWS-hosted architecture  
> **Outcome:** Static site on S3/CloudFront, chat API on API Gateway + Lambda, ingestion on ECS Fargate, vector store on RDS PostgreSQL with pgvector  
> **Infrastructure as Code:** AWS CDK (TypeScript) — all infrastructure defined, versioned, and deployed from the repo  
> **Timeline:** ~3-4 weeks across 6 phases (Phase 6 is optional)

---

## Table of Contents

1. [Why Migrate](#1-why-migrate)
2. [Current vs Target Architecture](#2-current-vs-target-architecture)
3. [Phase Overview](#3-phase-overview)
4. [CDK Project Structure](#4-cdk-project-structure)
5. [Phase 1: AWS Foundation + CDK Bootstrap](#phase-1-aws-foundation--cdk-bootstrap)
6. [Phase 2: Chat API (API Gateway + Lambda)](#phase-2-chat-api)
7. [Phase 3: Bedrock Integration (Embeddings + Chat)](#phase-3-bedrock-integration)
8. [Phase 4: Codebase Changes](#phase-4-codebase-changes)
9. [Phase 5: CI/CD Pipelines (GitHub Actions)](#phase-5-cicd-pipelines)
10. [Phase 6: RDS PostgreSQL + pgvector (Optional — Replace Supabase)](#phase-6-rds-postgresql--pgvector)
11. [Environment Variables Reference](#environment-variables-reference)
12. [Cost Estimate](#cost-estimate)
13. [Rollback Strategy](#rollback-strategy)
14. [Definition of Done](#definition-of-done)

---

## 1. Why Migrate

| Concern | Current (GitHub Pages) | Planned (Vercel) | Target (Full AWS) |
|---------|----------------------|-------------------|-------------------|
| Static site hosting | GitHub Pages | Vercel | S3 + CloudFront |
| Chat API | Not deployed | Vercel serverless functions | API Gateway + Lambda |
| Vector store | Supabase (pgvector) | Supabase (pgvector) | **RDS PostgreSQL + pgvector** (Phase 6, optional) |
| Embeddings | Ollama (local only) | OpenAI API key needed | **Bedrock Titan** (IAM, no API key) |
| Chat LLM | Ollama (local only) | Anthropic API key on Vercel | **Bedrock Claude** (IAM, no API key) |
| Ingestion pipeline | Manual local script | ECS Fargate (planned) | ECS Fargate |
| Secrets management | `.env.local` | Vercel env vars | AWS Secrets Manager / IAM roles |
| Vendor dependencies | GitHub | GitHub + Vercel + OpenAI + Anthropic | GitHub + **AWS only** (zero external vendors) |
| Custom domain | CNAME file | Vercel DNS | Route 53 / CloudFront |
| Infrastructure as Code | None | None (Vercel auto-configures) | **AWS CDK (TypeScript)** — versioned in repo |

**Key advantages of full AWS:**
- **Single cloud provider** — no Vercel, OpenAI, or Anthropic accounts needed
- **IAM roles everywhere** — Lambda and ECS get Bedrock access natively, no API keys
- **Infrastructure as Code** — all AWS resources defined in CDK TypeScript, reviewed in PRs, reproducible
- **Cost control** — pay-per-use with AWS free tier covering most of a portfolio site's traffic
- **Existing familiarity** — ECS Fargate was already planned for ingestion

---

## 2. Current vs Target Architecture

### Current State

```
GitHub Actions (nextjs.yml)
  └── Build Next.js → Static export → Deploy to GitHub Pages

Local development only:
  └── Ollama → Supabase → Chat via localhost:3000/api/chat
```

### Target State

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          GITHUB ACTIONS CI/CD                            │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐     │
│  │ deploy-site.yml │  │ deploy-infra.yml│  │ ingest.yml           │     │
│  │                 │  │ + deploy-api.yml│  │                      │     │
│  │ next build      │  │                 │  │ Build Docker image   │     │
│  │ → S3 sync       │  │ cdk deploy      │  │ → Push to ECR        │     │
│  │ → CF invalidate │  │ + Lambda update │  │ → Run ECS Fargate    │     │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬───────────┘     │
│           │                    │                       │                 │
└───────────┼────────────────────┼───────────────────────┼─────────────────┘
            │                    │                       │
            ▼                    ▼                       ▼
┌────────────────────┐ ┌──────────────────┐  ┌─────────────────────────┐
│ S3 + CloudFront    │ │ API Gateway      │  │ ECS Fargate Task        │
│                    │ │ + Lambda         │  │                         │
│ Static Next.js     │ │                  │  │ Load docs → Chunk       │
│ site               │ │ POST /chat       │  │ → Bedrock Embed         │
│ eribertolopez.com  │ │ GET  /health     │  │ → RDS pgvector Upsert   │
│                    │ │                  │  │                         │
│ Serves HTML/CSS/JS │ │ ┌──────────────┐ │  │ Runs on document change │
│ from edge cache    │ │ │ Lambda fn    │ │  │ or manual trigger       │
│                    │ │ │              │ │  └─────────────────────────┘
└────────────────────┘ │ │ 1. Embed     │ │
                       │ │    query     │ │
        ┌──────────────│ │    (Bedrock) │ │
        │ CORS headers │ │ 2. Search    │ │
        │              │ │    (RDS PG)  │ │
        ▼              │ │ 3. Generate  │ │
  ChatWidget.tsx       │ │    (Bedrock  │ │
  fetch(API_URL/chat)  │ │     Claude)  │ │
                       │ └──────────────┘ │
                       └──────────────────┘
                               │
                               ▼
                       ┌──────────────────┐
                       │ RDS PostgreSQL   │
                       │ + pgvector       │
                       │ (Phase 6)        │
                       │                  │
                       │ Or Supabase      │
                       │ (Phases 1-5)     │
                       └──────────────────┘
```

---

## 3. Phase Overview

| Phase | Description | Branch | Dependencies |
|-------|-------------|--------|-------------|
| **1** | AWS Foundation — S3, CloudFront, IAM, ACM cert | `feature/aws-foundation` | AWS account |
| **2** | Chat API — API Gateway + Lambda | `feature/aws-chat-api` | Phase 1 |
| **3** | Bedrock Integration — Replace Ollama/OpenAI/Anthropic | `feature/bedrock-providers` | Phase 2 |
| **4** | Codebase Changes — Static export, ChatWidget URL, cleanup | `feature/aws-codebase-migration` | Phase 3 |
| **5** | CI/CD Pipelines — GitHub Actions for site, API, ingestion | `feature/aws-cicd` | Phase 4 |
| **6** | **Optional:** RDS PostgreSQL + pgvector — Replace Supabase | `feature/rds-pgvector` | Phase 5 |

---

## 4. CDK Project Structure

All AWS infrastructure is defined in an `infra/` directory at the repo root using **AWS CDK v2 (TypeScript)**. CDK generates CloudFormation under the hood but lets us write infrastructure in the same language as the application.

### Why CDK

| Approach | Pros | Cons |
|----------|------|------|
| **AWS Console (ClickOps)** | Fast for exploration | Not reproducible, no review, drift |
| **CloudFormation (YAML)** | Native AWS, declarative | Verbose, no logic/loops, hard to read |
| **Terraform** | Multi-cloud, large ecosystem | HCL is another language to learn, state file |
| **AWS CDK (TypeScript)** | Same language as app, high-level constructs, generates CFN | AWS-only, abstraction can hide details |

**CDK wins for this project** because the entire codebase is TypeScript, CDK provides L2/L3 constructs that handle best practices (OAC, IAM policies, etc.) with minimal code, and there's no multi-cloud requirement.

### Directory Layout

```
infra/
├── bin/
│   └── app.ts                    # CDK app entry point — instantiates stacks
├── lib/
│   ├── static-site-stack.ts      # Phase 1: S3 + CloudFront + ACM + OAC
│   ├── chat-api-stack.ts         # Phase 2: Lambda + API Gateway + IAM
│   ├── ingestion-stack.ts        # Phase 5: ECR + ECS cluster + task def
│   └── database-stack.ts         # Phase 6: VPC + RDS + security groups
├── cdk.json                      # CDK config (app entry point, context)
├── package.json                  # CDK dependencies
└── tsconfig.json                 # TypeScript config for CDK
```

### Stack Dependency Graph

```
StaticSiteStack (Phase 1)
  └── S3 bucket, CloudFront, ACM cert, OAC, GitHub Actions IAM role

ChatApiStack (Phase 2 + 3)
  ├── Lambda function (bundled from lambda/ dir)
  ├── HTTP API Gateway with CORS
  ├── Lambda execution IAM role (Bedrock permissions)
  └── Exports: API URL (used by deploy-site.yml)

IngestionStack (Phase 5)
  ├── ECR repository
  ├── ECS Fargate cluster + task definition
  ├── ECS task execution IAM role (Bedrock + Secrets Manager)
  └── Uses: VPC from DatabaseStack (if Phase 6) or default VPC

DatabaseStack (Phase 6 — optional)
  ├── VPC (2 AZs, public + private subnets)
  ├── RDS PostgreSQL instance (private subnet)
  ├── Security groups (Lambda → RDS, ECS → RDS)
  ├── VPC endpoints (Bedrock, CloudWatch Logs)
  ├── Secrets Manager secret (DB credentials)
  └── Exports: DB endpoint, VPC, security groups
```

### Initial CDK Setup

```bash
# From repo root
mkdir infra && cd infra
npx cdk init app --language typescript
npm install aws-cdk-lib constructs
```

### `infra/bin/app.ts` — Entry Point

```typescript
#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { StaticSiteStack } from "../lib/static-site-stack";
import { ChatApiStack } from "../lib/chat-api-stack";
import { IngestionStack } from "../lib/ingestion-stack";
// import { DatabaseStack } from "../lib/database-stack"; // Phase 6

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1",
};

const site = new StaticSiteStack(app, "PortfolioSite", {
  env,
  domainName: "eribertolopez.com",
});

const api = new ChatApiStack(app, "PortfolioChatApi", {
  env,
  allowedOrigin: `https://eribertolopez.com`,
});

new IngestionStack(app, "PortfolioIngestion", {
  env,
});

// Phase 6: Uncomment when ready to migrate from Supabase
// const db = new DatabaseStack(app, "PortfolioDatabase", { env });
// Pass db.vpc and db.securityGroup to ChatApiStack and IngestionStack
```

### CDK Commands Reference

```bash
cd infra

# Synthesize CloudFormation (dry run — see what will be created)
npx cdk synth

# Show diff between deployed and local
npx cdk diff

# Deploy all stacks
npx cdk deploy --all

# Deploy a single stack
npx cdk deploy PortfolioSite

# Destroy all stacks (careful!)
npx cdk destroy --all
```

### CDK Bootstrap (One-Time Per Account/Region)

Before the first `cdk deploy`, you must bootstrap the AWS account:

```bash
npx cdk bootstrap aws://ACCOUNT_ID/us-east-1
```

This creates an S3 bucket and IAM roles that CDK uses to deploy CloudFormation stacks.

---

## Phase 1: AWS Foundation + CDK Bootstrap

**Goal:** Initialize the CDK project and deploy static site hosting infrastructure.

### Tasks

- [ ] **1.1** Initialize CDK project
  ```bash
  mkdir infra && cd infra
  npx cdk init app --language typescript
  npm install aws-cdk-lib constructs
  ```

- [ ] **1.2** Bootstrap CDK in your AWS account
  ```bash
  npx cdk bootstrap aws://ACCOUNT_ID/us-east-1
  ```

- [ ] **1.3** Create `infra/lib/static-site-stack.ts`

  ```typescript
  // infra/lib/static-site-stack.ts
  import * as cdk from "aws-cdk-lib";
  import * as s3 from "aws-cdk-lib/aws-s3";
  import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
  import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
  import * as acm from "aws-cdk-lib/aws-certificatemanager";
  import * as iam from "aws-cdk-lib/aws-iam";
  import { Construct } from "constructs";

  interface StaticSiteStackProps extends cdk.StackProps {
    domainName: string;
  }

  export class StaticSiteStack extends cdk.Stack {
    public readonly bucket: s3.Bucket;
    public readonly distribution: cloudfront.Distribution;
    public readonly deployRole: iam.Role;

    constructor(scope: Construct, id: string, props: StaticSiteStackProps) {
      super(scope, id, props);

      // S3 bucket — private, CloudFront accesses via OAC
      this.bucket = new s3.Bucket(this, "SiteBucket", {
        bucketName: `${props.domainName}-site`,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        versioned: true,
      });

      // ACM certificate (must be us-east-1 for CloudFront)
      const certificate = new acm.Certificate(this, "SiteCert", {
        domainName: props.domainName,
        subjectAlternativeNames: [`*.${props.domainName}`],
        validation: acm.CertificateValidation.fromDns(),
      });

      // CloudFront distribution with OAC
      this.distribution = new cloudfront.Distribution(this, "SiteDistribution", {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        domainNames: [props.domainName],
        certificate,
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 404,
            responsePagePath: "/404.html",
            ttl: cdk.Duration.minutes(5),
          },
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.minutes(5),
          },
        ],
      });

      // GitHub Actions OIDC provider
      const ghProvider = new iam.OpenIdConnectProvider(this, "GitHubOidc", {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
      });

      // IAM role for GitHub Actions deployments
      this.deployRole = new iam.Role(this, "GitHubActionsRole", {
        roleName: "github-actions-deploy",
        assumedBy: new iam.WebIdentityPrincipal(
          ghProvider.openIdConnectProviderArn,
          {
            StringEquals: {
              "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            },
            StringLike: {
              "token.actions.githubusercontent.com:sub":
                "repo:EribertoLopez/EribertoLopez.github.io:*",
            },
          }
        ),
      });

      // Grant deploy role: S3 write + CloudFront invalidation
      this.bucket.grantReadWrite(this.deployRole);
      this.deployRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ["cloudfront:CreateInvalidation"],
          resources: [
            `arn:aws:cloudfront::${this.account}:distribution/${this.distribution.distributionId}`,
          ],
        })
      );

      // Outputs for GitHub Actions secrets / workflows
      new cdk.CfnOutput(this, "BucketName", { value: this.bucket.bucketName });
      new cdk.CfnOutput(this, "DistributionId", {
        value: this.distribution.distributionId,
      });
      new cdk.CfnOutput(this, "DeployRoleArn", {
        value: this.deployRole.roleArn,
      });
    }
  }
  ```

- [ ] **1.4** Wire up in `infra/bin/app.ts`
  ```typescript
  const site = new StaticSiteStack(app, "PortfolioSite", {
    env,
    domainName: "eribertolopez.com",
  });
  ```

- [ ] **1.5** Preview and deploy
  ```bash
  cd infra
  npx cdk diff PortfolioSite    # Review what will be created
  npx cdk deploy PortfolioSite  # Deploy (ACM cert requires DNS validation)
  ```

- [ ] **1.6** Complete DNS validation
  - CDK will output the CNAME records needed for ACM validation
  - Add them to your DNS provider
  - After validation, add an A/AAAA ALIAS record pointing `eribertolopez.com` → CloudFront

- [ ] **1.7** Test manual deploy
  ```bash
  npm run build  # from repo root
  aws s3 sync ./out s3://$(cd infra && npx cdk context -j | jq -r '.BucketName') --delete
  ```

- [ ] **1.8** Delete `CNAME` file from repo (CloudFront handles the domain now)

### Definition of Done — Phase 1
- [ ] CDK project initialized in `infra/`
- [ ] `StaticSiteStack` deployed — S3 bucket, CloudFront, ACM cert, GitHub OIDC role
- [ ] `eribertolopez.com` resolves to CloudFront over HTTPS
- [ ] `npx cdk diff` shows no pending changes
- [ ] Manual `aws s3 sync` deploys the site successfully

---

## Phase 2: Chat API

**Goal:** Deploy the chat backend as an API Gateway + Lambda function.

### Tasks

- [ ] **2.1** Write Lambda handler (`lambda/handler.ts`)
  - Port logic from `pages/api/chat.ts` to Lambda event/response format
  - Include CORS headers in response
  - Also add a `GET /health` handler

  ```typescript
  // lambda/handler.ts — sketch
  import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
  import { generateChatResponse } from "../lib/ai";

  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  export async function handler(
    event: APIGatewayProxyEventV2
  ): Promise<APIGatewayProxyResultV2> {
    if (event.requestContext.http.method === "OPTIONS") {
      return { statusCode: 204, headers: CORS_HEADERS };
    }

    if (event.routeKey === "GET /health") {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ status: "ok" }),
      };
    }

    try {
      const { message, history = [] } = JSON.parse(event.body || "{}");
      const response = await generateChatResponse(message, history);
      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Failed to generate response" }),
      };
    }
  }
  ```

- [ ] **2.2** Create `infra/lib/chat-api-stack.ts`

  ```typescript
  // infra/lib/chat-api-stack.ts
  import * as cdk from "aws-cdk-lib";
  import * as lambda from "aws-cdk-lib/aws-lambda";
  import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
  import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
  import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
  import * as iam from "aws-cdk-lib/aws-iam";
  import * as logs from "aws-cdk-lib/aws-logs";
  import { Construct } from "constructs";
  import * as path from "path";

  interface ChatApiStackProps extends cdk.StackProps {
    allowedOrigin: string;
    deployRole?: iam.IRole; // from StaticSiteStack
  }

  export class ChatApiStack extends cdk.Stack {
    public readonly apiUrl: string;
    public readonly chatFunction: nodejs.NodejsFunction;

    constructor(scope: Construct, id: string, props: ChatApiStackProps) {
      super(scope, id, props);

      // Lambda function — bundled from lambda/handler.ts with esbuild
      this.chatFunction = new nodejs.NodejsFunction(this, "ChatHandler", {
        entry: path.join(__dirname, "../../lambda/handler.ts"),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 512,
        timeout: cdk.Duration.seconds(30),
        logRetention: logs.RetentionDays.TWO_WEEKS,
        environment: {
          EMBEDDING_PROVIDER: "bedrock",
          CHAT_PROVIDER: "bedrock",
          BEDROCK_REGION: "us-east-1",
          ALLOWED_ORIGIN: props.allowedOrigin,
          // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set via console
          // or fetched from Secrets Manager at runtime
        },
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: [], // bundle everything
        },
      });

      // Grant Bedrock access (embeddings + chat)
      this.chatFunction.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            "bedrock:InvokeModel",
            "bedrock:InvokeModelWithResponseStream",
          ],
          resources: [
            "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0",
            "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-*",
          ],
        })
      );

      // HTTP API Gateway
      const httpApi = new apigw.HttpApi(this, "ChatApi", {
        apiName: "portfolio-chat-api",
        corsPreflight: {
          allowOrigins: [props.allowedOrigin],
          allowMethods: [apigw.CorsHttpMethod.POST, apigw.CorsHttpMethod.GET],
          allowHeaders: ["Content-Type"],
        },
        // Throttling — replaces in-memory rate limiter
        throttle: {
          rateLimit: 10,  // requests per second
          burstLimit: 20,
        },
      });

      const lambdaIntegration = new integrations.HttpLambdaIntegration(
        "ChatIntegration",
        this.chatFunction
      );

      httpApi.addRoutes({
        path: "/chat",
        methods: [apigw.HttpMethod.POST],
        integration: lambdaIntegration,
      });

      httpApi.addRoutes({
        path: "/health",
        methods: [apigw.HttpMethod.GET],
        integration: lambdaIntegration,
      });

      this.apiUrl = httpApi.apiEndpoint;

      // Grant deploy role permission to update Lambda code (for CI/CD)
      if (props.deployRole) {
        this.chatFunction.grantInvoke(props.deployRole);
        props.deployRole.addToPolicy(
          new iam.PolicyStatement({
            actions: [
              "lambda:UpdateFunctionCode",
              "lambda:UpdateFunctionConfiguration",
            ],
            resources: [this.chatFunction.functionArn],
          })
        );
      }

      // Outputs
      new cdk.CfnOutput(this, "ApiUrl", { value: httpApi.apiEndpoint });
      new cdk.CfnOutput(this, "FunctionName", {
        value: this.chatFunction.functionName,
      });
    }
  }
  ```

- [ ] **2.3** Wire up in `infra/bin/app.ts`
  ```typescript
  const api = new ChatApiStack(app, "PortfolioChatApi", {
    env,
    allowedOrigin: "https://eribertolopez.com",
    deployRole: site.deployRole,
  });
  ```

- [ ] **2.4** Deploy the stack
  ```bash
  cd infra
  npx cdk diff PortfolioChatApi
  npx cdk deploy PortfolioChatApi
  ```

- [ ] **2.5** Set Supabase secrets on the Lambda
  - CDK creates the function; add sensitive env vars via console or CLI:
  ```bash
  aws lambda update-function-configuration \
    --function-name $(cdk output PortfolioChatApi.FunctionName) \
    --environment "Variables={
      EMBEDDING_PROVIDER=bedrock,
      CHAT_PROVIDER=bedrock,
      SUPABASE_URL=https://your-project.supabase.co,
      SUPABASE_SERVICE_ROLE_KEY=your-key
    }"
  ```
  > In a later iteration, use Secrets Manager + CDK to avoid CLI for secrets.

- [ ] **2.6** Test the endpoint
  ```bash
  curl -X POST $(cd infra && npx cdk output PortfolioChatApi.ApiUrl)/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "What is your experience with React?"}'
  ```

### Definition of Done — Phase 2
- [ ] `ChatApiStack` deployed — Lambda + HTTP API Gateway
- [ ] `POST /chat` returns AI-generated responses
- [ ] `GET /health` returns 200
- [ ] CORS allows requests from `eribertolopez.com`
- [ ] API Gateway throttling is active (10 req/s, burst 20)
- [ ] Lambda has Bedrock IAM permissions
- [ ] Lambda logs appear in CloudWatch

---

## Phase 3: Bedrock Integration

**Goal:** Replace OpenAI and Anthropic API keys with AWS Bedrock (IAM-authenticated).

### Why Bedrock

| Concern | OpenAI + Anthropic | AWS Bedrock |
|---------|-------------------|-------------|
| Authentication | API keys as env vars | IAM roles (native) |
| Embedding model | OpenAI `text-embedding-3-small` (1536d) | Amazon Titan V2 (configurable: 256/512/1024d) |
| Chat model | Anthropic Claude | Bedrock Claude (same model, AWS-hosted) |
| Billing | Separate vendor bills | Unified AWS bill |
| Cold start | External HTTP calls | AWS-internal calls (potentially lower latency) |

### Tasks

- [ ] **3.1** Enable Bedrock model access in AWS Console
  - Region: `us-east-1` (or your preferred region)
  - Models to enable:
    - `amazon.titan-embed-text-v2:0` (embeddings)
    - `anthropic.claude-3-sonnet-20240229-v1:0` (or latest Claude on Bedrock)

- [ ] **3.2** Add Bedrock permissions to Lambda IAM role
  ```json
  {
    "Effect": "Allow",
    "Action": [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream"
    ],
    "Resource": [
      "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0",
      "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-*"
    ]
  }
  ```

- [ ] **3.3** Create `lib/embeddings/bedrock.ts`
  - Implement `EmbeddingProvider` interface
  - Use `@aws-sdk/client-bedrock-runtime` SDK
  - Model: `amazon.titan-embed-text-v2:0`
  - Default dimension: 1024 (configurable)

  ```typescript
  // lib/embeddings/bedrock.ts — sketch
  import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
  import type { EmbeddingProvider } from "./types";

  export class BedrockEmbedding implements EmbeddingProvider {
    readonly name = "bedrock";
    readonly dimension: number;
    private client: BedrockRuntimeClient;

    constructor(
      private region = "us-east-1",
      private model = "amazon.titan-embed-text-v2:0",
      dimension = 1024
    ) {
      this.dimension = dimension;
      this.client = new BedrockRuntimeClient({ region });
    }

    async embed(text: string): Promise<number[]> {
      const command = new InvokeModelCommand({
        modelId: this.model,
        contentType: "application/json",
        body: JSON.stringify({
          inputText: text,
          dimensions: this.dimension,
        }),
      });
      const response = await this.client.send(command);
      const body = JSON.parse(new TextDecoder().decode(response.body));
      return body.embedding;
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
      // Titan V2 doesn't support native batching — loop
      return Promise.all(texts.map((t) => this.embed(t)));
    }
  }
  ```

- [ ] **3.4** Create `lib/chat/bedrock.ts`
  - Implement `ChatProvider` interface
  - Use Bedrock's Anthropic Claude model
  - Support both generate and generateStream

  ```typescript
  // lib/chat/bedrock.ts — sketch
  import {
    BedrockRuntimeClient,
    InvokeModelCommand,
    InvokeModelWithResponseStreamCommand,
  } from "@aws-sdk/client-bedrock-runtime";
  import type { ChatProvider } from "./types";
  import type { ChatMessage } from "../types";

  export class BedrockChat implements ChatProvider {
    readonly name = "bedrock";
    private client: BedrockRuntimeClient;

    constructor(
      private region = "us-east-1",
      private model = "anthropic.claude-3-sonnet-20240229-v1:0",
      private maxTokens = 1024
    ) {
      this.client = new BedrockRuntimeClient({ region });
    }

    async generate(
      systemPrompt: string,
      history: ChatMessage[],
      userMessage: string
    ): Promise<string> {
      const command = new InvokeModelCommand({
        modelId: this.model,
        contentType: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: this.maxTokens,
          system: systemPrompt,
          messages: [...history, { role: "user", content: userMessage }],
        }),
      });
      const response = await this.client.send(command);
      const body = JSON.parse(new TextDecoder().decode(response.body));
      return body.content[0]?.text || "I couldn't generate a response.";
    }

    async generateStream(
      systemPrompt: string,
      history: ChatMessage[],
      userMessage: string,
      onChunk: (text: string) => void
    ): Promise<void> {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: this.model,
        contentType: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: this.maxTokens,
          system: systemPrompt,
          messages: [...history, { role: "user", content: userMessage }],
        }),
      });
      const response = await this.client.send(command);
      if (response.body) {
        for await (const event of response.body) {
          if (event.chunk?.bytes) {
            const data = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
            if (data.type === "content_block_delta" && data.delta?.text) {
              onChunk(data.delta.text);
            }
          }
        }
      }
    }
  }
  ```

- [ ] **3.5** Update provider factories
  - Add `"bedrock"` case to `lib/embeddings/index.ts`
  - Add `"bedrock"` case to `lib/chat/index.ts`

- [ ] **3.6** Update `lib/config.ts`
  - Add `bedrock` section with `region`, `embeddingModel`, `chatModel` config
  - Add `BEDROCK_REGION`, `BEDROCK_EMBEDDING_MODEL`, `BEDROCK_CHAT_MODEL` env vars

- [ ] **3.7** Update vector store dimension
  - **Critical:** Titan V2 default is 1024 dimensions (not 1536 like OpenAI or 768 like Ollama)
  - Drop and recreate the `documents` table with `vector(1024)`
  - Update the `match_documents` function signature
  - Applies to both Supabase (Phases 1-5) and RDS (Phase 6)

- [ ] **3.8** Re-ingest documents with Bedrock embeddings
  - Run `scripts/ingest.ts` with `EMBEDDING_PROVIDER=bedrock`
  - Verify search results with `scripts/test-search.ts`

- [ ] **3.9** Install AWS SDK dependency
  ```bash
  npm install @aws-sdk/client-bedrock-runtime
  ```

### Definition of Done — Phase 3
- [ ] `lib/embeddings/bedrock.ts` passes embedding tests
- [ ] `lib/chat/bedrock.ts` generates chat responses via Bedrock Claude
- [ ] Supabase table rebuilt with correct vector dimension (1024)
- [ ] Documents re-ingested with Bedrock Titan embeddings
- [ ] Search returns relevant results using Bedrock embeddings
- [ ] No OpenAI or Anthropic API keys needed

---

## Phase 4: Codebase Changes

**Goal:** Update the Next.js app for static export + external API.

### Files to Modify

| File | Change |
|------|--------|
| `next.config.js` | Add `output: 'export'` for static site generation |
| `components/ChatWidget.tsx` | Change `fetch("/api/chat")` → `fetch(NEXT_PUBLIC_CHAT_API_URL)` |
| `lib/config.ts` | Add `bedrock` provider config entries |
| `lib/embeddings/index.ts` | Add `"bedrock"` factory case |
| `lib/chat/index.ts` | Add `"bedrock"` factory case |
| `.env.example` | Add Bedrock config vars, document AWS-only setup |
| `CNAME` | **Delete** — no longer needed (CloudFront handles domain) |
| `package.json` | Add `@aws-sdk/client-bedrock-runtime` dependency |

### Files to Create

| File | Purpose |
|------|---------|
| `lib/embeddings/bedrock.ts` | Bedrock Titan embedding provider |
| `lib/chat/bedrock.ts` | Bedrock Claude chat provider |
| `lambda/handler.ts` | Lambda entry point (wraps existing `lib/ai.ts` logic) |
| `infra/` | CDK project (created in Phase 1) |

### Files to Delete

| File | Reason |
|------|--------|
| `pages/api/chat.ts` | Replaced by Lambda function |
| `CNAME` | Replaced by CloudFront custom domain |
| `.github/workflows/nextjs.yml` | Replaced by `deploy-site.yml` |

### Tasks

- [ ] **4.1** Update `next.config.js`
  ```javascript
  const nextConfig = {
    output: 'export',
    images: { unoptimized: true },
  }
  module.exports = nextConfig
  ```

- [ ] **4.2** Update `components/ChatWidget.tsx`
  - Change fetch URL from relative to environment variable
  ```typescript
  // Before
  const response = await fetch("/api/chat", { ... });

  // After
  const API_URL = process.env.NEXT_PUBLIC_CHAT_API_URL || "/api/chat";
  const response = await fetch(`${API_URL}/chat`, { ... });
  ```

- [ ] **4.3** Create Lambda handler (`lambda/handler.ts`)
  - Port request/response logic from `pages/api/chat.ts`
  - Adapt from Next.js request/response to Lambda event/context
  - Include CORS headers in response
  - Bundle `lib/` directory with the Lambda

- [ ] **4.4** Remove `pages/api/chat.ts`
  - Lambda handler replaces this entirely

- [ ] **4.5** Delete `CNAME` file

- [ ] **4.6** Update `.env.example` with full AWS config

- [ ] **4.7** Verify static build works
  ```bash
  npm run build
  ls out/  # Should contain index.html, _next/, etc.
  ```

### Definition of Done — Phase 4
- [ ] `next build` produces static export in `out/`
- [ ] ChatWidget points to configurable external API URL
- [ ] Lambda handler works locally (test with `npx cdk synth` + `sam local invoke`, or unit tests)
- [ ] No references to Vercel or GitHub Pages remain
- [ ] Build completes without errors

---

## Phase 5: CI/CD Pipelines

**Goal:** Automate all deployments through GitHub Actions. Infrastructure changes deploy via `cdk deploy`; application changes deploy via S3 sync / Lambda code update.

### Deployment Model

```
infra/**  changed  →  deploy-infra.yml  →  cdk deploy --all
site code changed  →  deploy-site.yml   →  next build → S3 sync → CF invalidate
lambda/** changed  →  deploy-api.yml    →  cdk deploy PortfolioChatApi (re-bundles Lambda)
documents/ changed →  ingest.yml        →  Docker build → ECR push → ECS run-task
```

> **Key insight:** CDK's `NodejsFunction` construct bundles the Lambda code automatically with esbuild during `cdk deploy`. So for Lambda code changes, `cdk deploy PortfolioChatApi` handles both infra AND code updates in one step. No separate zip/upload needed.

### Workflows to Create

#### `deploy-infra.yml` — Infrastructure Changes (CDK)

```yaml
# .github/workflows/deploy-infra.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
    paths:
      - 'infra/**'
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '21'
          cache: 'npm'

      - name: Install CDK dependencies
        working-directory: infra
        run: npm ci

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: CDK diff (preview changes)
        working-directory: infra
        run: npx cdk diff --all

      - name: CDK deploy
        working-directory: infra
        run: npx cdk deploy --all --require-approval never
```

#### `deploy-site.yml` — Static Site Deployment

```yaml
# .github/workflows/deploy-site.yml
name: Deploy Static Site

on:
  push:
    branches: [main]
    paths:
      - 'components/**'
      - 'pages/**'
      - 'styles/**'
      - 'public/**'
      - '_posts/**'
      - '_projects/**'
      - '_resumes/**'
      - 'next.config.js'
      - 'package.json'
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '21'
          cache: 'npm'

      - run: npm ci

      - name: Build static site
        run: npm run build
        env:
          NEXT_PUBLIC_CHAT_API_URL: ${{ secrets.CHAT_API_URL }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy to S3
        run: aws s3 sync ./out s3://${{ secrets.S3_BUCKET }} --delete

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

#### `deploy-api.yml` — Chat API Code Deployment

```yaml
# .github/workflows/deploy-api.yml
name: Deploy Chat API

on:
  push:
    branches: [main]
    paths:
      - 'lambda/**'
      - 'lib/ai.ts'
      - 'lib/chat/**'
      - 'lib/embeddings/**'
      - 'lib/vectorStore/**'
      - 'lib/config.ts'
      - 'lib/errors.ts'
      - 'lib/types.ts'
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '21'
          cache: 'npm'

      - name: Install CDK dependencies
        working-directory: infra
        run: npm ci

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      # CDK's NodejsFunction re-bundles the Lambda code during deploy
      - name: Deploy Lambda via CDK
        working-directory: infra
        run: npx cdk deploy PortfolioChatApi --require-approval never
```

#### `ingest.yml` — Document Ingestion Pipeline

```yaml
# .github/workflows/ingest.yml
name: Ingest Documents

on:
  push:
    branches: [main]
    paths:
      - 'documents/**'
  workflow_dispatch:
    inputs:
      reason:
        description: 'Reason for re-ingestion'
        required: false

permissions:
  id-token: write
  contents: read

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        run: |
          docker build -f Dockerfile.ingest -t portfolio-ingest .
          docker tag portfolio-ingest:latest ${{ secrets.ECR_REPO_URI }}:latest
          docker push ${{ secrets.ECR_REPO_URI }}:latest

      - name: Run ECS Fargate task
        run: |
          TASK_ARN=$(aws ecs run-task \
            --cluster portfolio-cluster \
            --task-definition portfolio-ingest \
            --launch-type FARGATE \
            --network-configuration '{
              "awsvpcConfiguration": {
                "subnets": ["${{ secrets.SUBNET_ID }}"],
                "securityGroups": ["${{ secrets.SECURITY_GROUP_ID }}"],
                "assignPublicIp": "ENABLED"
              }
            }' \
            --query 'tasks[0].taskArn' \
            --output text)

          echo "Task ARN: $TASK_ARN"
          aws ecs wait tasks-stopped --cluster portfolio-cluster --tasks "$TASK_ARN"

          EXIT_CODE=$(aws ecs describe-tasks \
            --cluster portfolio-cluster --tasks "$TASK_ARN" \
            --query 'tasks[0].containers[0].exitCode' --output text)

          echo "Exit code: $EXIT_CODE"
          [ "$EXIT_CODE" = "0" ] || exit 1
```

### CDK IngestionStack (ECS + ECR)

Add `infra/lib/ingestion-stack.ts` to define the ECS cluster, ECR repo, and task definition in CDK:

```typescript
// infra/lib/ingestion-stack.ts — sketch
import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class IngestionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ECR repository for ingestion Docker image
    const repo = new ecr.Repository(this, "IngestRepo", {
      repositoryName: "portfolio-ingest",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 5 }], // Keep last 5 images
    });

    // ECS cluster
    const cluster = new ecs.Cluster(this, "IngestCluster", {
      clusterName: "portfolio-cluster",
    });

    // Task definition
    const taskDef = new ecs.FargateTaskDefinition(this, "IngestTask", {
      family: "portfolio-ingest",
      cpu: 512,
      memoryLimitMiB: 1024,
    });

    // Grant Bedrock access to task role
    taskDef.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [
          "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0",
        ],
      })
    );

    // Container
    taskDef.addContainer("IngestContainer", {
      image: ecs.ContainerImage.fromEcrRepository(repo),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "ingest",
        logRetention: logs.RetentionDays.TWO_WEEKS,
      }),
      environment: {
        EMBEDDING_PROVIDER: "bedrock",
        BEDROCK_REGION: "us-east-1",
        // SUPABASE_URL and key injected via secrets
      },
    });

    // Outputs for GitHub Actions
    new cdk.CfnOutput(this, "EcrRepoUri", { value: repo.repositoryUri });
    new cdk.CfnOutput(this, "ClusterName", { value: cluster.clusterName });
    new cdk.CfnOutput(this, "TaskDefFamily", { value: taskDef.family! });
  }
}
```

### Tasks

- [ ] **5.1** Create `infra/lib/ingestion-stack.ts`
- [ ] **5.2** Deploy IngestionStack: `npx cdk deploy PortfolioIngestion`
- [ ] **5.3** Create `.github/workflows/deploy-infra.yml`
- [ ] **5.4** Create `.github/workflows/deploy-site.yml`
- [ ] **5.5** Create `.github/workflows/deploy-api.yml`
- [ ] **5.6** Create `.github/workflows/ingest.yml`
- [ ] **5.7** Create `Dockerfile.ingest` for ingestion pipeline
- [ ] **5.8** Add GitHub repository secrets (values from CDK outputs):
  | Secret | Source |
  |--------|--------|
  | `AWS_ROLE_ARN` | `PortfolioSite.DeployRoleArn` output |
  | `S3_BUCKET` | `PortfolioSite.BucketName` output |
  | `CLOUDFRONT_DISTRIBUTION_ID` | `PortfolioSite.DistributionId` output |
  | `CHAT_API_URL` | `PortfolioChatApi.ApiUrl` output |
  | `ECR_REPO_URI` | `PortfolioIngestion.EcrRepoUri` output |
  | `SUBNET_ID` | From VPC (default VPC or CDK VPC in Phase 6) |
  | `SECURITY_GROUP_ID` | From ECS security group |

- [ ] **5.9** Delete `.github/workflows/nextjs.yml` (old GitHub Pages workflow)

- [ ] **5.10** Test full pipeline end-to-end
  - Push an `infra/` change → `deploy-infra.yml` runs `cdk deploy`
  - Push a site change → `deploy-site.yml` runs S3 sync + CF invalidation
  - Push a `lambda/` change → `deploy-api.yml` runs `cdk deploy PortfolioChatApi`
  - Push a `documents/` change → `ingest.yml` builds Docker + runs ECS task

### Definition of Done — Phase 5
- [ ] All 4 GitHub Actions workflows created and tested
- [ ] Infrastructure changes deploy via `cdk deploy`
- [ ] Site auto-deploys on push to main
- [ ] Lambda code auto-deploys via CDK (re-bundles with esbuild)
- [ ] Ingestion triggers when documents change
- [ ] All workflows use OIDC (no long-lived AWS keys in GitHub)
- [ ] Old GitHub Pages workflow removed
- [ ] GitHub secrets populated from CDK stack outputs

---

## Phase 6: RDS PostgreSQL + pgvector

**Goal:** Replace Supabase with AWS-managed PostgreSQL to eliminate the last external vendor dependency.

> **This phase is optional.** Supabase's free tier works well and costs $0. Only proceed if you want a fully self-contained AWS stack with zero external vendors (besides GitHub).

### Why Replace Supabase?

| Concern | Supabase (Current) | RDS PostgreSQL |
|---------|-------------------|----------------|
| Vendor | External (supabase.co) | AWS-managed |
| Auth model | API key (service role key) | IAM auth or password via Secrets Manager |
| pgvector | Yes | Yes (PostgreSQL 15.4+, 16+) |
| Free tier | 500MB, forever | db.t4g.micro — 750 hrs/mo for 12 months |
| After free tier | $25/mo (Pro plan) | ~$12/mo (db.t4g.micro) |
| VPC networking | Public internet | **Private subnet** — Lambda connects via VPC, no public exposure |
| Backups | Daily (Pro), none (Free) | Automated daily snapshots (free up to DB size) |
| Data residency | Supabase-managed region | Your AWS region, your VPC |

### Cost Comparison

| Scenario | Supabase | RDS db.t4g.micro |
|----------|----------|-----------------|
| **First 12 months** | $0 | $0 (free tier) |
| **After 12 months** | $0 (free tier) or $25 (Pro) | ~$12/mo |
| **Storage (20GB)** | Included in free tier | ~$2.30/mo |
| **Backups** | None (free) / Daily (Pro) | Free up to DB size |

> **Decision point:** If you're comfortable with ~$14/month after the first year for a fully AWS-managed, VPC-private database, Phase 6 is worth it. If you prefer $0/month and don't mind the external vendor, stick with Supabase.

### Architecture Change

```
Lambda (in VPC)
  ├── Bedrock (via VPC endpoint)
  └── RDS PostgreSQL + pgvector (private subnet, port 5432)

ECS Fargate (in same VPC)
  ├── Bedrock (via VPC endpoint)
  └── RDS PostgreSQL + pgvector (same private subnet)
```

> **Important:** Once Lambda is placed in a VPC to reach RDS, it loses public internet access by default. You need either a **NAT Gateway** (~$32/mo — expensive!) or **VPC endpoints** for Bedrock and other AWS services. VPC endpoints are cheaper for low traffic.

### VPC Networking Options

| Option | Cost | Complexity | Best For |
|--------|------|-----------|----------|
| **NAT Gateway** | ~$32/mo + data | Simple | High traffic, many external calls |
| **VPC Endpoints (Bedrock + S3 + Logs)** | ~$7/mo each | Moderate | Low traffic, AWS-only calls |
| **RDS Proxy + Public Lambda** | ~$10/mo | Moderate | Avoid VPC Lambda cold starts |
| **RDS Public Access + Security Group** | $0 | Simple but less secure | Dev/testing only |

**Recommended for portfolio:** Use **VPC endpoints** for Bedrock and CloudWatch Logs (~$14/mo total for 2 endpoints). This keeps the DB private and avoids the expensive NAT Gateway.

> **Cost-conscious alternative:** Keep Lambda public (not in VPC), make RDS publicly accessible but locked to Lambda's security group / IP ranges. Less secure but $0 networking cost. Acceptable for a portfolio with non-sensitive data.

### Tasks

- [ ] **6.1** Create `infra/lib/database-stack.ts`

  This CDK stack defines the VPC, RDS instance, security groups, VPC endpoints, and Secrets Manager secret — all in one file:

  ```typescript
  // infra/lib/database-stack.ts
  import * as cdk from "aws-cdk-lib";
  import * as ec2 from "aws-cdk-lib/aws-ec2";
  import * as rds from "aws-cdk-lib/aws-rds";
  import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
  import { Construct } from "constructs";

  export class DatabaseStack extends cdk.Stack {
    public readonly vpc: ec2.Vpc;
    public readonly dbInstance: rds.DatabaseInstance;
    public readonly dbSecret: secretsmanager.ISecret;
    public readonly lambdaSecurityGroup: ec2.SecurityGroup;
    public readonly ecsSecurityGroup: ec2.SecurityGroup;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      // VPC — 2 AZs, public + private subnets
      this.vpc = new ec2.Vpc(this, "PortfolioVpc", {
        maxAzs: 2,
        natGateways: 0, // Use VPC endpoints instead (cost savings)
        subnetConfiguration: [
          {
            name: "Public",
            subnetType: ec2.SubnetType.PUBLIC,
            cidrMask: 24,
          },
          {
            name: "Private",
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            cidrMask: 24,
          },
        ],
      });

      // VPC endpoints — so Lambda/ECS in private subnets can reach AWS services
      this.vpc.addInterfaceEndpoint("BedrockEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME,
      });
      this.vpc.addInterfaceEndpoint("LogsEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      });
      this.vpc.addInterfaceEndpoint("SecretsEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      });

      // Security groups
      this.lambdaSecurityGroup = new ec2.SecurityGroup(this, "LambdaSg", {
        vpc: this.vpc,
        description: "Lambda function security group",
        allowAllOutbound: true,
      });

      this.ecsSecurityGroup = new ec2.SecurityGroup(this, "EcsSg", {
        vpc: this.vpc,
        description: "ECS Fargate task security group",
        allowAllOutbound: true,
      });

      const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSg", {
        vpc: this.vpc,
        description: "RDS PostgreSQL security group",
        allowAllOutbound: false,
      });

      // Allow Lambda and ECS → RDS on port 5432
      dbSecurityGroup.addIngressRule(
        this.lambdaSecurityGroup,
        ec2.Port.tcp(5432),
        "Lambda to RDS"
      );
      dbSecurityGroup.addIngressRule(
        this.ecsSecurityGroup,
        ec2.Port.tcp(5432),
        "ECS to RDS"
      );

      // DB credentials in Secrets Manager (auto-generated password)
      this.dbSecret = new secretsmanager.Secret(this, "DbSecret", {
        secretName: "portfolio/db-credentials",
        generateSecretString: {
          secretStringTemplate: JSON.stringify({ username: "portfolio_app" }),
          generateStringKey: "password",
          excludePunctuation: true,
        },
      });

      // RDS PostgreSQL instance
      this.dbInstance = new rds.DatabaseInstance(this, "PortfolioDb", {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_16,
        }),
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T4G,
          ec2.InstanceSize.MICRO // Free tier eligible
        ),
        vpc: this.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [dbSecurityGroup],
        credentials: rds.Credentials.fromSecret(this.dbSecret),
        databaseName: "portfolio",
        allocatedStorage: 20,
        storageType: rds.StorageType.GP3,
        multiAz: false,
        deletionProtection: true,
        removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
        backupRetention: cdk.Duration.days(7),
      });

      // Outputs
      new cdk.CfnOutput(this, "DbEndpoint", {
        value: this.dbInstance.instanceEndpoint.hostname,
      });
      new cdk.CfnOutput(this, "DbSecretArn", {
        value: this.dbSecret.secretArn,
      });
      new cdk.CfnOutput(this, "VpcId", { value: this.vpc.vpcId });
    }
  }
  ```

- [ ] **6.2** Update `infra/bin/app.ts` to enable DatabaseStack
  ```typescript
  import { DatabaseStack } from "../lib/database-stack";

  const db = new DatabaseStack(app, "PortfolioDatabase", { env });

  // Update ChatApiStack to use VPC from DatabaseStack
  const api = new ChatApiStack(app, "PortfolioChatApi", {
    env,
    allowedOrigin: "https://eribertolopez.com",
    deployRole: site.deployRole,
    vpc: db.vpc,
    lambdaSecurityGroup: db.lambdaSecurityGroup,
    dbSecret: db.dbSecret,
  });
  ```

- [ ] **6.3** Update `ChatApiStack` to accept optional VPC props
  - When VPC is provided, place Lambda in private subnets
  - Grant Lambda read access to the DB secret
  - Set `DATABASE_URL` from Secrets Manager at runtime

- [ ] **6.4** Deploy the database stack
  ```bash
  cd infra
  npx cdk diff PortfolioDatabase
  npx cdk deploy PortfolioDatabase  # Takes ~10 min for RDS
  ```

- [ ] **6.5** Enable pgvector extension and create schema
  - Connect to RDS via bastion host or SSM Session Manager (DB is in private subnet)
  ```sql
  -- Enable pgvector
  CREATE EXTENSION IF NOT EXISTS vector;

  -- Create documents table (1024 for Bedrock Titan V2)
  CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(1024),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- IVFFlat index for fast similarity search
  CREATE INDEX ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

  -- Similarity search function (same as Supabase version)
  CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1024),
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.0
  )
  RETURNS TABLE (
    id TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
      d.id,
      d.content,
      d.metadata,
      1 - (d.embedding <=> query_embedding) AS similarity
    FROM documents d
    WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;
  ```

- [ ] **6.6** Create `lib/vectorStore/rds.ts`
  - Implement `VectorRepository` interface (same as `SupabaseVectorStore`)
  - Use `pg` (node-postgres) client instead of Supabase client
  - Connect using credentials from Secrets Manager or environment variables

  ```typescript
  // lib/vectorStore/rds.ts — sketch
  import { Pool } from "pg";
  import { VectorStoreError } from "../errors";
  import { pipelineConfig } from "../config";
  import type { ChunkRecord, SearchResult } from "../types";
  import type { VectorRepository } from "./types";

  export class RdsVectorStore implements VectorRepository {
    private pool: Pool;

    constructor(connectionString: string) {
      this.pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    }

    async upsert(chunks: ChunkRecord[]): Promise<void> {
      const client = await this.pool.connect();
      try {
        for (const chunk of chunks) {
          await client.query(
            `INSERT INTO documents (id, content, metadata, embedding)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET
               content = EXCLUDED.content,
               metadata = EXCLUDED.metadata,
               embedding = EXCLUDED.embedding`,
            [chunk.id, chunk.text, JSON.stringify(chunk.metadata), JSON.stringify(chunk.embedding)]
          );
        }
      } finally {
        client.release();
      }
    }

    async search(queryEmbedding: number[], topK: number): Promise<SearchResult[]> {
      const { rows } = await this.pool.query(
        `SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS similarity
         FROM documents
         WHERE 1 - (embedding <=> $1::vector) > $2
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        [JSON.stringify(queryEmbedding), pipelineConfig.vectorStore.matchThreshold, topK]
      );
      return rows.map((row: any) => ({
        id: row.id,
        score: row.similarity,
        text: row.content,
        metadata: row.metadata,
      }));
    }

    async deleteAll(): Promise<void> {
      await this.pool.query("TRUNCATE documents");
    }

    async ping(): Promise<boolean> {
      try {
        await this.pool.query("SELECT 1");
        return true;
      } catch {
        return false;
      }
    }
  }
  ```

- [ ] **6.7** Update `lib/vectorStore/index.ts` factory
  - Add `"rds"` case that creates `RdsVectorStore`
  - Add `VECTOR_STORE_PROVIDER` env var (`"supabase"` | `"rds"`)

- [ ] **6.8** Update `lib/config.ts`
  - Add `rds` section under `vectorStore` config
  ```typescript
  vectorStore: {
    provider: env("VECTOR_STORE_PROVIDER", "supabase") as "supabase" | "rds",
    // Supabase config (existing)
    url: () => envRequired("SUPABASE_URL"),
    key: () => envRequired("SUPABASE_SERVICE_ROLE_KEY"),
    // RDS config (new)
    rds: {
      connectionString: () => process.env.DATABASE_URL || "",
    },
    // Shared config
    batchSize: env("UPSERT_BATCH_SIZE", 100) as number,
    matchThreshold: envFloat("MATCH_THRESHOLD", 0.3),
    topK: env("TOP_K", 5) as number,
  },
  ```

- [ ] **6.9** Redeploy ChatApiStack with VPC configuration
  - CDK handles Lambda VPC placement, security groups, and ENI permissions automatically
  ```bash
  npx cdk deploy PortfolioChatApi  # Now places Lambda in VPC
  ```

- [ ] **6.10** Redeploy IngestionStack with VPC configuration
  - Update IngestionStack to accept VPC/security group from DatabaseStack
  ```bash
  npx cdk deploy PortfolioIngestion
  ```

- [ ] **6.11** Install `pg` dependency
  ```bash
  npm install pg
  npm install -D @types/pg
  ```

- [ ] **6.12** Re-ingest documents into RDS
  - Run ingestion script with `VECTOR_STORE_PROVIDER=rds`
  - Verify search results

- [ ] **6.13** Update CI/CD workflows
  - No workflow changes needed — `cdk deploy` handles Lambda VPC config + env vars
  - ECS task definition updated via CDK — just redeploy IngestionStack

- [ ] **6.14** Decommission Supabase
  - Verify RDS is serving all traffic correctly
  - Remove Supabase environment variables
  - Delete Supabase project (optional — can keep as backup)
  - Remove `@supabase/supabase-js` from `package.json`

### Definition of Done — Phase 6
- [ ] RDS PostgreSQL instance running with pgvector enabled
- [ ] `lib/vectorStore/rds.ts` implements the `VectorRepository` interface
- [ ] Lambda connects to RDS via VPC private networking
- [ ] Ingestion pipeline writes to RDS
- [ ] Chat API reads from RDS and returns correct results
- [ ] No Supabase dependency remains
- [ ] Zero external vendors (AWS + GitHub only)

---

## ADR-008: RDS PostgreSQL over Supabase for Vector Storage

**Status:** Proposed (Optional — Phase 6)

**Context:** Supabase provides a managed PostgreSQL database with pgvector, but it's an external vendor. AWS RDS for PostgreSQL also supports pgvector and keeps everything in-house.

**Decision:** Offer RDS PostgreSQL + pgvector as an optional migration path (Phase 6) to eliminate the last external vendor dependency.

**Consequences:**
- ✅ Zero external vendors — fully self-contained AWS stack
- ✅ VPC private networking — database never exposed to public internet
- ✅ IAM database authentication available (optional, instead of passwords)
- ✅ Automated backups, point-in-time recovery, snapshots
- ✅ Same SQL schema, same pgvector queries — minimal code changes
- ❌ ~$12-14/month after free tier (vs $0 on Supabase free tier)
- ❌ Requires VPC networking for Lambda (adds complexity + VPC endpoint costs)
- ❌ Must manage connection pooling (Supabase handles this transparently)
- ❌ No built-in REST API (Supabase gives you PostgREST for free)

**Recommendation:** Complete Phases 1-5 with Supabase first. Migrate to RDS in Phase 6 only if you want the fully AWS-native architecture or need VPC-private database access.

---

## Environment Variables Reference

### Lambda Function (Chat API)

| Variable | Required | Value |
|----------|----------|-------|
| `EMBEDDING_PROVIDER` | Yes | `bedrock` |
| `CHAT_PROVIDER` | Yes | `bedrock` |
| `BEDROCK_REGION` | No | `us-east-1` (default) |
| `BEDROCK_EMBEDDING_MODEL` | No | `amazon.titan-embed-text-v2:0` (default) |
| `BEDROCK_CHAT_MODEL` | No | `anthropic.claude-3-sonnet-20240229-v1:0` (default) |
| `VECTOR_STORE_PROVIDER` | No | `supabase` (default) or `rds` (Phase 6) |
| `SUPABASE_URL` | If supabase | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | If supabase | Your Supabase service role key |
| `DATABASE_URL` | If rds | `postgresql://user:pass@host:5432/portfolio` (Phase 6) |
| `MATCH_THRESHOLD` | No | `0.3` (default) |
| `TOP_K` | No | `5` (default) |
| `CHAT_MAX_TOKENS` | No | `1024` (default) |
| `CHAT_MAX_MESSAGE_LENGTH` | No | `2000` (default) |
| `CHAT_MAX_HISTORY` | No | `50` (default) |

### GitHub Actions Build (Static Site)

| Variable | Required | Value |
|----------|----------|-------|
| `NEXT_PUBLIC_CHAT_API_URL` | Yes | API Gateway invoke URL |

### ECS Fargate (Ingestion)

Same as Lambda, plus:

| Variable | Required | Value |
|----------|----------|-------|
| `CHUNK_SIZE` | No | `500` (default) |
| `CHUNK_OVERLAP` | No | `100` (default) |
| `UPSERT_BATCH_SIZE` | No | `100` (default) |

### Local Development (`.env.local`)

```bash
# Local dev still uses Ollama (free, no AWS needed)
EMBEDDING_PROVIDER=ollama
CHAT_PROVIDER=ollama
OLLAMA_CHAT_MODEL=llama3.2

# Supabase (same instance, but may use different vector dimensions locally)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key

# Optional: test Bedrock locally (requires AWS CLI configured)
# EMBEDDING_PROVIDER=bedrock
# CHAT_PROVIDER=bedrock
# BEDROCK_REGION=us-east-1
```

---

## Cost Estimate

For a personal portfolio site with ~100 chat interactions/month:

### Phases 1-5 (with Supabase)

| Service | Usage | Estimated Cost |
|---------|-------|---------------|
| S3 | ~50MB storage, ~1GB transfer | **$0.05/mo** (free tier covers it) |
| CloudFront | ~2GB transfer | **$0.00** (1TB free tier first year) |
| Lambda | ~100 invocations, 30s avg | **$0.00** (1M free requests/mo) |
| API Gateway | ~100 requests | **$0.00** (1M free requests first year) |
| Bedrock Titan Embeddings | ~100 queries × ~50 tokens | **$0.001/mo** |
| Bedrock Claude | ~100 queries × ~500 tokens out | **$0.50/mo** |
| ECS Fargate (ingestion) | ~5 min/month | **$0.01/mo** |
| ECR | ~500MB image | **$0.05/mo** |
| Supabase (free tier) | 500MB database | **$0.00** |
| **Total (Phases 1-5)** | | **~$0.60/month** |

> After AWS free tier expires (12 months), CloudFront adds ~$0.10/mo. Still under $1/month.

### Phase 6 (with RDS — replaces Supabase)

| Service | Usage | First 12 Months | After Free Tier |
|---------|-------|----------------|-----------------|
| RDS db.t4g.micro | PostgreSQL 16, 20GB gp3 | **$0.00** (free tier) | **~$12/mo** |
| RDS storage | 20 GB gp3 | **$0.00** (free tier) | **~$2.30/mo** |
| VPC Endpoints (Bedrock + Logs) | 2 endpoints | **~$14/mo** | **~$14/mo** |
| Supabase | Removed | **-$0.00** | **-$0.00** |
| **Phase 6 increment** | | **+$14/mo** | **+$28/mo** |
| **Total (all phases)** | | **~$14.60/month** | **~$28.60/month** |

> **Cost-saving alternative:** Skip VPC endpoints and make RDS publicly accessible (locked to Lambda security group). This brings Phase 6 cost to ~$0 during free tier and ~$14/mo after. Less secure but acceptable for non-sensitive portfolio data.

> **When Phase 6 makes sense financially:** If you ever outgrow Supabase's free tier (500MB), Supabase Pro is $25/mo. At that point, RDS (~$14/mo) is actually cheaper.

---

## Rollback Strategy

| Component | Rollback Method |
|-----------|----------------|
| **Infrastructure** | `cdk deploy` with reverted `infra/` code; or revert Git commit and let `deploy-infra.yml` redeploy |
| **Static site** | S3 versioning — restore previous version; or revert Git commit and redeploy |
| **Chat API** | Revert code + `cdk deploy PortfolioChatApi` — CDK re-bundles previous Lambda code |
| **Ingestion** | Documents are in Git — revert the `documents/` change and re-trigger the workflow |
| **Database (Supabase)** | Re-run ingestion to rebuild from source documents |
| **Database (RDS)** | RDS automated backups + point-in-time recovery; or re-run ingestion |
| **Phase 6 rollback** | Set `VECTOR_STORE_PROVIDER=supabase` in CDK config → `cdk deploy` — factory switches back |
| **Full rollback** | `cdk destroy --all`, re-enable `nextjs.yml`, update DNS back to GitHub Pages |

---

## Definition of Done

### Phases 1-5 Complete When:

- [ ] `eribertolopez.com` serves the static site from CloudFront
- [ ] Chat widget communicates with API Gateway + Lambda
- [ ] Chat responses use Bedrock Claude with Bedrock Titan embeddings
- [ ] No Vercel, OpenAI, or Anthropic accounts/API keys required
- [ ] GitHub Actions deploys site, API, and ingestion automatically
- [ ] Local development still works with Ollama (no AWS dependency for dev)
- [ ] All documentation updated (this plan, architecture diagram, deployment guide)
- [ ] Old GitHub Pages workflow removed
- [ ] Cost is under $1/month for portfolio-level traffic (with Supabase free tier)

### Phase 6 Additionally Complete When:

- [ ] Vector store runs on RDS PostgreSQL + pgvector (private VPC)
- [ ] No Supabase dependency remains
- [ ] `VECTOR_STORE_PROVIDER=rds` in all production environments
- [ ] Zero external vendors — AWS + GitHub only
- [ ] `@supabase/supabase-js` removed from `package.json`

---

## ADR Appendix

### ADR-007: Full AWS over Vercel + Multi-Vendor

**Status:** Proposed

**Context:** The site was going to deploy on Vercel (for Next.js serverless functions) with OpenAI (embeddings) and Anthropic (chat). This requires accounts and API keys across 3 vendors.

**Decision:** Deploy everything on AWS — S3/CloudFront for static hosting, API Gateway + Lambda for the chat API, Bedrock for both embeddings (Titan) and chat (Claude), ECS Fargate for ingestion.

**Consequences:**
- ✅ Single vendor — one AWS bill, one set of credentials
- ✅ IAM roles — no API keys for AI services (Bedrock uses IAM natively)
- ✅ Cost effective — free tier covers most portfolio traffic
- ✅ Full control — no vendor limits on serverless function duration, size, etc.
- ✅ Infrastructure as code — all resources defined in CDK TypeScript (see ADR-009)
- ❌ More initial setup than Vercel (which auto-detects Next.js)
- ❌ Must manage CloudFront cache invalidation, S3 sync, etc.
- ❌ Bedrock model selection is more limited than direct API access
- ❌ Static export means no SSR/ISR (acceptable for a portfolio site)

**Alternatives Considered:**
- **Vercel + OpenAI + Anthropic:** Simpler setup but 3 vendors, API keys as env vars
- **Vercel + Bedrock:** Hybrid — Vercel for hosting, Bedrock for AI — still 2 vendors
- **Full AWS with RDS pgvector:** Replaces Supabase too — see Phase 6 and ADR-008

---

### ADR-009: AWS CDK (TypeScript) for Infrastructure as Code

**Status:** Accepted

**Context:** The AWS migration requires provisioning ~15 resources across multiple services (S3, CloudFront, Lambda, API Gateway, RDS, ECS, IAM, VPC, etc.). These need to be reproducible, reviewable in PRs, and maintainable over time.

**Decision:** Use AWS CDK v2 with TypeScript for all infrastructure definitions. CDK code lives in `infra/` at the repo root.

**Consequences:**
- ✅ Same language as the application (TypeScript) — one language across the entire repo
- ✅ CDK L2 constructs handle best practices automatically (OAC for S3, IAM least-privilege, security group rules)
- ✅ `NodejsFunction` construct bundles Lambda code with esbuild during `cdk deploy` — no separate zip/upload step
- ✅ `cdk diff` shows exactly what will change before deploying — safe, reviewable
- ✅ Stack outputs (bucket name, API URL, etc.) feed directly into GitHub Actions secrets
- ✅ Stacks can reference each other (DatabaseStack VPC → ChatApiStack Lambda) with type safety
- ❌ AWS-only — cannot manage non-AWS resources (Supabase, GitHub) via CDK
- ❌ CDK abstractions can hide CloudFormation details — harder to debug edge cases
- ❌ CDK bootstrap required per account/region (one-time setup)
- ❌ `cdk deploy` is slower than raw AWS CLI for simple changes (synthesizes full CFN template)

**Alternatives Considered:**
- **Terraform:** Multi-cloud, large ecosystem, but HCL is another language and state file management adds complexity
- **AWS SAM:** Good for serverless, but limited for non-Lambda resources (CloudFront, RDS, VPC)
- **CloudFormation (raw YAML):** Verbose, no logic/loops, harder to maintain as infrastructure grows
- **Pulumi:** TypeScript support like CDK, but smaller AWS ecosystem and requires state backend
- **Console/CLI (ClickOps):** Fast for prototyping but not reproducible, no PR review, configuration drift

**CDK Project Conventions:**
- One stack per logical boundary (`StaticSiteStack`, `ChatApiStack`, `DatabaseStack`, `IngestionStack`)
- Cross-stack references via constructor props (typed, compile-time safe)
- All `CfnOutput` values documented and used as GitHub Actions secrets
- `cdk.json` context stores environment-specific config (domain name, region)

---

*Plan created 2026-02-08, updated 2026-02-08 | Branch: `feature/aws-migration`*
