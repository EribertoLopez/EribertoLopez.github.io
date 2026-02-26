#!/bin/bash
# check-deploy-prereqs.sh — Verify AWS prerequisites for AI Chat deployment
# Run: aws login first, then ./scripts/check-deploy-prereqs.sh

set -e

echo "=========================================="
echo "  AI Chat Deploy Prerequisites Check"
echo "=========================================="
echo ""

REGION="${AWS_REGION:-us-east-1}"
echo "Region: $REGION"
echo ""

# 1. Check caller identity
echo "--- AWS Identity ---"
aws sts get-caller-identity --output table
echo ""

# 2. Check Bedrock model access
echo "--- Bedrock Model Access ---"
echo "Checking Titan Embed v2..."
aws bedrock get-foundation-model \
  --model-identifier amazon.titan-embed-text-v2:0 \
  --region $REGION \
  --query 'modelDetails.{ModelId:modelId,Status:modelLifecycle.status}' \
  --output table 2>/dev/null || echo "❌ Titan Embed v2 not accessible"

echo "Checking Claude 3 Haiku..."
aws bedrock get-foundation-model \
  --model-identifier anthropic.claude-3-haiku-20240307-v1:0 \
  --region $REGION \
  --query 'modelDetails.{ModelId:modelId,Status:modelLifecycle.status}' \
  --output table 2>/dev/null || echo "❌ Claude 3 Haiku not accessible"
echo ""

# 3. Find Aurora clusters
echo "--- Aurora/RDS Clusters ---"
aws rds describe-db-clusters \
  --region $REGION \
  --query 'DBClusters[].{ClusterID:DBClusterIdentifier,Engine:Engine,Endpoint:Endpoint,Port:Port,Status:Status}' \
  --output table 2>/dev/null || echo "No clusters found"
echo ""

# 4. Find RDS Proxies
echo "--- RDS Proxies ---"
aws rds describe-db-proxies \
  --region $REGION \
  --query 'DBProxies[].{ProxyName:DBProxyName,Endpoint:Endpoint,Status:Status,ProxyArn:DBProxyArn}' \
  --output table 2>/dev/null || echo "No proxies found"
echo ""

# 5. Check pgvector extension (requires connection — just show the command)
echo "--- pgvector Check ---"
echo "Run this SQL on your Aurora cluster to check/enable pgvector:"
echo "  SELECT * FROM pg_available_extensions WHERE name = 'vector';"
echo "  CREATE EXTENSION IF NOT EXISTS vector;"
echo ""

# 6. Find GitHub OIDC provider
echo "--- IAM OIDC Providers ---"
aws iam list-open-id-connect-providers \
  --query 'OpenIDConnectProviderList[].Arn' \
  --output table 2>/dev/null || echo "No OIDC providers"
echo ""

# 7. Find relevant IAM roles (look for deploy/github roles)
echo "--- IAM Roles (deploy/github related) ---"
aws iam list-roles \
  --query 'Roles[?contains(RoleName,`deploy`) || contains(RoleName,`Deploy`) || contains(RoleName,`github`) || contains(RoleName,`GitHub`) || contains(RoleName,`cdk`) || contains(RoleName,`CDK`)].{RoleName:RoleName,Arn:Arn}' \
  --output table 2>/dev/null || echo "No matching roles"
echo ""

# 8. Find S3 buckets (frontend)
echo "--- S3 Buckets (frontend candidates) ---"
aws s3api list-buckets \
  --query 'Buckets[?contains(Name,`eriberto`) || contains(Name,`portfolio`) || contains(Name,`frontend`)].Name' \
  --output table 2>/dev/null || echo "No matching buckets"
echo ""

# 9. Find CloudFront distributions
echo "--- CloudFront Distributions ---"
aws cloudfront list-distributions \
  --query 'DistributionList.Items[].{Id:Id,Domain:DomainName,Aliases:Aliases.Items[0],Status:Status}' \
  --output table 2>/dev/null || echo "No distributions"
echo ""

# 10. Find Secrets Manager secrets (DB creds)
echo "--- Secrets Manager (DB credentials) ---"
aws secretsmanager list-secrets \
  --region $REGION \
  --query 'SecretList[?contains(Name,`db`) || contains(Name,`database`) || contains(Name,`eribertolopez`)].{Name:Name,ARN:ARN}' \
  --output table 2>/dev/null || echo "No matching secrets"
echo ""

# 11. Find SSM parameters
echo "--- SSM Parameters (project related) ---"
aws ssm describe-parameters \
  --region $REGION \
  --parameter-filters "Key=Name,Values=/eribertolopez" \
  --query 'Parameters[].{Name:Name,Type:Type}' \
  --output table 2>/dev/null || echo "No matching parameters"
echo ""

echo "=========================================="
echo "  Done! Use the values above to configure"
echo "  GitHub secrets and vars for deployment."
echo "=========================================="
