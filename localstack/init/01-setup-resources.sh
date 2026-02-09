#!/bin/bash
# LocalStack init script — runs when LocalStack is ready
# Creates AWS resources that mirror production infrastructure

set -euo pipefail

ENDPOINT="http://localhost:4566"
REGION="us-east-1"
AWS="awslocal"

echo "==> Creating S3 bucket (mirrors Phase 1 StaticSiteStack)..."
$AWS s3 mb s3://eribertolopez-site --region $REGION 2>/dev/null || true
$AWS s3api put-bucket-encryption --bucket eribertolopez-site \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

echo "==> Creating SSM parameters..."
$AWS ssm put-parameter --name /chat-api/url --value "http://localhost:4566/restapis" --type String --overwrite
$AWS ssm put-parameter --name /chat-api/allowed-origins --value "http://localhost:3000,http://localhost:4566" --type String --overwrite

echo "==> Creating Secrets Manager secret (mirrors Phase 6 RDS credentials)..."
$AWS secretsmanager create-secret \
  --name portfolio-chat/db-credentials \
  --secret-string '{"username":"chatdev","password":"localdev123","host":"postgres","port":"5432","dbname":"portfolio_chat"}' \
  2>/dev/null || \
$AWS secretsmanager update-secret \
  --secret-id portfolio-chat/db-credentials \
  --secret-string '{"username":"chatdev","password":"localdev123","host":"postgres","port":"5432","dbname":"portfolio_chat"}'

echo "==> Creating DynamoDB table for rate limiting..."
$AWS dynamodb create-table \
  --table-name chat-rate-limits \
  --attribute-definitions AttributeName=pk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION 2>/dev/null || true

echo "==> Creating SQS queue for ingestion..."
$AWS sqs create-queue --queue-name ingestion-queue --region $REGION 2>/dev/null || true

echo "==> LocalStack initialization complete!"
