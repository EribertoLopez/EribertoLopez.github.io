/**
 * CloudFront Distribution Configuration
 * 
 * This file contains environment-specific CloudFront configurations.
 * Sensitive values (like certificate ARNs) can be overridden via environment variables.
 */

export interface CloudFrontEnvironmentConfig {
  // Domain Configuration
  customDomain?: string;
  certificateArn?: string;
  
  // CloudFront Settings
  priceClass: 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';
  enableIPv6: boolean;
  enableCompression: boolean;
  httpVersion: 'http2' | 'http2and3';
  
  // Cache Configuration
  cachePolicyId?: string; // AWS Managed or custom cache policy ID
  
  // Origin Settings
  connectionTimeout: number; // seconds
  connectionAttempts: number;
  
  // Security
  minimumProtocolVersion: string;
  sslSupportMethod: 'sni-only' | 'vip';
  
  // S3 Bucket
  bucketRegion?: string;
  
  // Logging
  enableLogging: boolean;
  
  // WAF (future)
  webAclArn?: string;
}

/**
 * Environment-specific CloudFront configurations
 * Based on deployed infrastructure in test and production environments
 */
export const cloudFrontConfigurations: Record<string, CloudFrontEnvironmentConfig> = {
  // Local Development - Minimal config, no custom domain
  local: {
    priceClass: 'PriceClass_100',
    enableIPv6: false,
    enableCompression: true,
    httpVersion: 'http2',
    connectionTimeout: 10,
    connectionAttempts: 3,
    minimumProtocolVersion: 'TLSv1.2_2021',
    sslSupportMethod: 'sni-only',
    enableLogging: false,
  },
  
  // Test Environment (AWS Account: 250203447304)
  test: {
    customDomain: 'dev-fund-a-scholar.hsf.net',
    // Certificate ARN from env var: CLOUDFRONT_CERTIFICATE_ARN
    // Expected: arn:aws:acm:us-east-1:250203447304:certificate/d49a4a84-1ec4-4e72-8e04-433d3ea6f218
    priceClass: 'PriceClass_100',
    enableIPv6: false,
    enableCompression: true,
    httpVersion: 'http2',
    cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6', // AWS Managed-CachingOptimized
    connectionTimeout: 10,
    connectionAttempts: 3,
    minimumProtocolVersion: 'TLSv1.2_2021',
    sslSupportMethod: 'sni-only',
    bucketRegion: 'us-west-2',
    enableLogging: false,
  },
  
  // Dev Environment (same as test for now)
  dev: {
    customDomain: 'dev-fund-a-scholar.hsf.net',
    priceClass: 'PriceClass_100',
    enableIPv6: false,
    enableCompression: true,
    httpVersion: 'http2',
    cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
    connectionTimeout: 10,
    connectionAttempts: 3,
    minimumProtocolVersion: 'TLSv1.2_2021',
    sslSupportMethod: 'sni-only',
    bucketRegion: 'us-west-2',
    enableLogging: false,
  },
  
  // Staging Environment (future)
  staging: {
    customDomain: 'staging-fund-a-scholar.hsf.net',
    priceClass: 'PriceClass_100',
    enableIPv6: false,
    enableCompression: true,
    httpVersion: 'http2',
    cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
    connectionTimeout: 10,
    connectionAttempts: 3,
    minimumProtocolVersion: 'TLSv1.2_2021',
    sslSupportMethod: 'sni-only',
    bucketRegion: 'us-west-1',
    enableLogging: true,
  },
  
  // Production Environment (AWS Account: 580472969326)
  prod: {
    customDomain: 'fund-a-scholar.hsf.net',
    // Certificate ARN from env var: CLOUDFRONT_CERTIFICATE_ARN
    // Expected: arn:aws:acm:us-east-1:580472969326:certificate/e26fa4e8-87b0-4568-b6b2-cbacfb2433c2
    priceClass: 'PriceClass_100',
    enableIPv6: false,
    enableCompression: true,
    httpVersion: 'http2',
    cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6', // AWS Managed-CachingOptimized
    connectionTimeout: 10,
    connectionAttempts: 3,
    minimumProtocolVersion: 'TLSv1.2_2021',
    sslSupportMethod: 'sni-only',
    bucketRegion: 'us-west-1',
    enableLogging: true,
  },
  
  // Alias for prod
  production: {
    customDomain: 'fund-a-scholar.hsf.net',
    priceClass: 'PriceClass_100',
    enableIPv6: false,
    enableCompression: true,
    httpVersion: 'http2',
    cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
    connectionTimeout: 10,
    connectionAttempts: 3,
    minimumProtocolVersion: 'TLSv1.2_2021',
    sslSupportMethod: 'sni-only',
    bucketRegion: 'us-west-1',
    enableLogging: true,
  },
};

/**
 * Get CloudFront configuration for an environment with env var overrides
 * 
 * @param environment - The target environment (local, test, dev, staging, prod)
 * @returns CloudFront configuration with environment variable overrides applied
 * 
 * @example
 * ```typescript
 * const config = getCloudFrontConfig('prod');
 * // Returns prod config with CLOUDFRONT_CERTIFICATE_ARN from env if set
 * ```
 */
export function getCloudFrontConfig(environment: string): CloudFrontEnvironmentConfig {
  const baseConfig = cloudFrontConfigurations[environment] || cloudFrontConfigurations.local;
  
  // Allow environment variable overrides for sensitive/dynamic values
  const config: CloudFrontEnvironmentConfig = {
    ...baseConfig,
    // Override with env vars if provided
    customDomain: process.env.CLOUDFRONT_CUSTOM_DOMAIN || baseConfig.customDomain,
    certificateArn: process.env.CLOUDFRONT_CERTIFICATE_ARN || baseConfig.certificateArn,
    cachePolicyId: process.env.CLOUDFRONT_CACHE_POLICY_ID || baseConfig.cachePolicyId,
    webAclArn: process.env.CLOUDFRONT_WEB_ACL_ARN || baseConfig.webAclArn,
    bucketRegion: process.env.CLOUDFRONT_BUCKET_REGION || baseConfig.bucketRegion,
  };

  return config;
}

/**
 * Validate that required configuration is present for environments with custom domains
 */
export function validateCloudFrontConfig(
  environment: string,
  config: CloudFrontEnvironmentConfig
): void {
  if (config.customDomain && !config.certificateArn) {
    throw new Error(
      `CloudFront configuration error for environment '${environment}': ` +
      `Custom domain '${config.customDomain}' requires a certificate ARN. ` +
      `Set CLOUDFRONT_CERTIFICATE_ARN environment variable.`
    );
  }
}

