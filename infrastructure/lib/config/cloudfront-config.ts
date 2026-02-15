/**
 * CloudFront Distribution Configuration
 * 
 * Environment-specific CloudFront configurations.
 * Sensitive values (like certificate ARNs) should be set via environment variables.
 */

export interface CloudFrontEnvironmentConfig {
  customDomain?: string;
  certificateArn?: string;
  priceClass: 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';
  enableIPv6: boolean;
  enableCompression: boolean;
  httpVersion: 'http2' | 'http2and3';
  cachePolicyId?: string;
  connectionTimeout: number;
  connectionAttempts: number;
  minimumProtocolVersion: string;
  sslSupportMethod: 'sni-only' | 'vip';
  bucketRegion?: string;
  enableLogging: boolean;
  webAclArn?: string;
}

/**
 * Environment-specific CloudFront configurations
 * Custom domains and certificate ARNs should be provided via environment variables.
 */
export const cloudFrontConfigurations: Record<string, CloudFrontEnvironmentConfig> = {
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
  
  dev: {
    priceClass: 'PriceClass_100',
    enableIPv6: false,
    enableCompression: true,
    httpVersion: 'http2',
    cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
    connectionTimeout: 10,
    connectionAttempts: 3,
    minimumProtocolVersion: 'TLSv1.2_2021',
    sslSupportMethod: 'sni-only',
    enableLogging: false,
  },

  staging: {
    priceClass: 'PriceClass_100',
    enableIPv6: false,
    enableCompression: true,
    httpVersion: 'http2',
    cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
    connectionTimeout: 10,
    connectionAttempts: 3,
    minimumProtocolVersion: 'TLSv1.2_2021',
    sslSupportMethod: 'sni-only',
    enableLogging: true,
  },
  
  prod: {
    priceClass: 'PriceClass_100',
    enableIPv6: false,
    enableCompression: true,
    httpVersion: 'http2',
    cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
    connectionTimeout: 10,
    connectionAttempts: 3,
    minimumProtocolVersion: 'TLSv1.2_2021',
    sslSupportMethod: 'sni-only',
    enableLogging: true,
  },

  production: {
    priceClass: 'PriceClass_100',
    enableIPv6: false,
    enableCompression: true,
    httpVersion: 'http2',
    cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
    connectionTimeout: 10,
    connectionAttempts: 3,
    minimumProtocolVersion: 'TLSv1.2_2021',
    sslSupportMethod: 'sni-only',
    enableLogging: true,
  },
};

export function getCloudFrontConfig(environment: string): CloudFrontEnvironmentConfig {
  const baseConfig = cloudFrontConfigurations[environment] || cloudFrontConfigurations.local;
  
  return {
    ...baseConfig,
    customDomain: process.env.CLOUDFRONT_CUSTOM_DOMAIN || baseConfig.customDomain,
    certificateArn: process.env.CLOUDFRONT_CERTIFICATE_ARN || baseConfig.certificateArn,
    cachePolicyId: process.env.CLOUDFRONT_CACHE_POLICY_ID || baseConfig.cachePolicyId,
    webAclArn: process.env.CLOUDFRONT_WEB_ACL_ARN || baseConfig.webAclArn,
    bucketRegion: process.env.CLOUDFRONT_BUCKET_REGION || baseConfig.bucketRegion,
  };
}

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
