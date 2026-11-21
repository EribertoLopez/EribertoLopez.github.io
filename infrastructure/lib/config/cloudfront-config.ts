/**
 * CloudFront distribution configuration.
 *
 * The portfolio domain is registered at Namecheap. DNS validation CNAMEs and
 * the website ALIAS/CNAME records are added in Namecheap Advanced DNS.
 * This stack does not create a hosted zone or DNS records.
 *
 * CloudFront accepts only us-east-1 certificates. Import the issued
 * certificate with CLOUDFRONT_CERTIFICATE_ARN. The deploy stays unblocked
 * while the owner adds the Namecheap validation CNAMEs.
 */

export const SITE_APEX_DOMAIN = "eribertolopez.com";
export const SITE_WWW_DOMAIN = "www.eribertolopez.com";
export const SITE_DOMAINS = [SITE_APEX_DOMAIN, SITE_WWW_DOMAIN] as const;

const US_EAST_1_CERT_ARN =
  /^arn:aws:acm:us-east-1:\d{12}:certificate\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CloudFrontEnvironmentConfig {
  /** Alternate domain names. Empty means the distribution stays on its cloudfront.net hostname. */
  customDomains: string[];
  /** us-east-1 ACM certificate ARN. Required before customDomains are attached. */
  certificateArn?: string;
  priceClass: "PriceClass_100" | "PriceClass_200" | "PriceClass_All";
  enableIPv6: boolean;
  enableCompression: boolean;
  httpVersion: "http2" | "http2and3";
  cachePolicyId?: string;
  connectionTimeout: number;
  connectionAttempts: number;
  minimumProtocolVersion: string;
  sslSupportMethod: "sni-only" | "vip";
  bucketRegion?: string;
  enableLogging: boolean;
  webAclArn?: string;
}

export type CertificateAttachment = "attached" | "pending-certificate" | "not-configured";

const sharedEdge: Pick<
  CloudFrontEnvironmentConfig,
  | "priceClass"
  | "enableIPv6"
  | "enableCompression"
  | "httpVersion"
  | "connectionTimeout"
  | "connectionAttempts"
  | "minimumProtocolVersion"
  | "sslSupportMethod"
  | "customDomains"
> = {
  priceClass: "PriceClass_100",
  enableIPv6: false,
  enableCompression: true,
  httpVersion: "http2",
  connectionTimeout: 10,
  connectionAttempts: 3,
  minimumProtocolVersion: "TLSv1.2_2021",
  sslSupportMethod: "sni-only",
  customDomains: [],
};

/**
 * Environment-specific CloudFront configurations.
 * The certificate ARN is never stored here. Set CLOUDFRONT_CERTIFICATE_ARN.
 */
export const cloudFrontConfigurations: Record<string, CloudFrontEnvironmentConfig> = {
  local: {
    ...sharedEdge,
    enableLogging: false,
  },

  dev: {
    ...sharedEdge,
    cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
    enableLogging: false,
  },

  staging: {
    ...sharedEdge,
    cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
    enableLogging: true,
  },

  prod: {
    ...sharedEdge,
    customDomains: [...SITE_DOMAINS],
    cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
    enableLogging: true,
  },

  production: {
    ...sharedEdge,
    customDomains: [...SITE_DOMAINS],
    cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
    enableLogging: true,
  },
};

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getCloudFrontConfig(environment: string): CloudFrontEnvironmentConfig {
  const baseConfig = cloudFrontConfigurations[environment] || cloudFrontConfigurations.local;
  const envDomain = blankToUndefined(process.env.CLOUDFRONT_CUSTOM_DOMAIN);
  // Prod domains are fixed in code. The env override only applies to environments
  // that do not already list alternate domain names.
  const customDomains = baseConfig.customDomains.length
    ? [...baseConfig.customDomains]
    : envDomain
      ? [envDomain]
      : [];

  return {
    ...baseConfig,
    customDomains,
    certificateArn: blankToUndefined(process.env.CLOUDFRONT_CERTIFICATE_ARN),
    cachePolicyId: blankToUndefined(process.env.CLOUDFRONT_CACHE_POLICY_ID) || baseConfig.cachePolicyId,
    webAclArn: blankToUndefined(process.env.CLOUDFRONT_WEB_ACL_ARN) || baseConfig.webAclArn,
    bucketRegion: blankToUndefined(process.env.CLOUDFRONT_BUCKET_REGION) || baseConfig.bucketRegion,
  };
}

export function certificateAttachment(config: CloudFrontEnvironmentConfig): CertificateAttachment {
  if (config.customDomains.length === 0) {
    return "not-configured";
  }
  if (config.certificateArn) {
    return "attached";
  }
  return "pending-certificate";
}

export function validateCloudFrontConfig(
  environment: string,
  config: CloudFrontEnvironmentConfig
): void {
  // Environments without alternate names ignore the ARN so a prod secret in the
  // shell does not fail dev or local deploys.
  if (!config.certificateArn || config.customDomains.length === 0) {
    return;
  }

  if (!US_EAST_1_CERT_ARN.test(config.certificateArn)) {
    throw new Error(
      `CloudFront configuration error for environment '${environment}': ` +
        `CLOUDFRONT_CERTIFICATE_ARN must be a us-east-1 ACM certificate ARN ` +
        `(arn:aws:acm:us-east-1:ACCOUNT:certificate/UUID). ` +
        `CloudFront rejects certificates from any other region. ` +
        `Request the certificate in us-east-1 and validate it with Namecheap CNAMEs.`
    );
  }
}
