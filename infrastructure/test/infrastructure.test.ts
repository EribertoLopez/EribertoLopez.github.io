import * as path from "path";
import * as fs from "fs";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { FrontendStack } from "../lib/frontend";
import { loadSiteRouterCode } from "../lib/cloudfront-functions/load-site-router";
import {
  certificateAttachment,
  getCloudFrontConfig,
} from "../lib/config/cloudfront-config";

const CERT_ARN =
  "arn:aws:acm:us-east-1:123456789012:certificate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const ENV_KEYS = [
  "CLOUDFRONT_CERTIFICATE_ARN",
  "CLOUDFRONT_CUSTOM_DOMAIN",
  "CLOUDFRONT_CACHE_POLICY_ID",
  "CLOUDFRONT_WEB_ACL_ARN",
  "CLOUDFRONT_BUCKET_REGION",
];

function withEnv(vars: Record<string, string | undefined>, run: () => void): void {
  const previous = new Map<string, string | undefined>();
  for (const key of ENV_KEYS) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function synthFrontend(environment: string, region = "us-west-2"): Template {
  const app = new cdk.App();
  const stack = new FrontendStack(app, `Frontend-${environment}-${region}`, {
    environment,
    env: { account: "123456789012", region },
  });
  return Template.fromStack(stack);
}

type RouterEvent = {
  request: {
    method?: string;
    uri?: string;
    querystring?: Record<string, { value?: string; multiValue?: Array<{ value: string }> }>;
    headers?: { host?: { value: string } };
  };
};

function loadRouter(): (event: RouterEvent) => {
  statusCode?: number;
  headers?: { location?: { value: string } };
  request?: RouterEvent["request"];
  uri?: string;
} {
  const source = loadSiteRouterCode();
  const factory = new Function(`${source}\nreturn handler;`) as () => (event: RouterEvent) => {
    statusCode?: number;
    headers?: { location?: { value: string } };
    uri?: string;
  };
  return factory();
}

describe("site router", () => {
  const handler = loadRouter();

  function request(uri: string, extras: Partial<RouterEvent["request"]> = {}): RouterEvent {
    return {
      request: {
        method: "GET",
        uri,
        querystring: {},
        headers: { host: { value: "eribertolopez.com" } },
        ...extras,
      },
    };
  }

  test("rewrites /latest/<slug> to the static export html file", () => {
    const event = request("/latest/running-10-agent-ai-org");
    const result = handler(event);
    expect(result.uri ?? event.request.uri).toBe("/latest/running-10-agent-ai-org.html");
  });

  test("strips a trailing slash before adding .html", () => {
    const event = request("/latest/sdlc-grok-cursor-linear/");
    handler(event);
    expect(event.request.uri).toBe("/latest/sdlc-grok-cursor-linear.html");
  });

  test("rewrites the latest index and leaves the site root to defaultRootObject", () => {
    const latest = request("/latest");
    handler(latest);
    expect(latest.request.uri).toBe("/latest.html");

    const latestSlash = request("/latest/");
    handler(latestSlash);
    expect(latestSlash.request.uri).toBe("/latest.html");

    const root = request("/");
    handler(root);
    expect(root.request.uri).toBe("/");
  });

  test("leaves files that already have an extension", () => {
    const event = request("/assets/blog/agentic-engineering/cover.png");
    handler(event);
    expect(event.request.uri).toBe("/assets/blog/agentic-engineering/cover.png");
  });

  test("does not rewrite non-GET requests", () => {
    const event = request("/latest/running-10-agent-ai-org", { method: "POST" });
    handler(event);
    expect(event.request.uri).toBe("/latest/running-10-agent-ai-org");
  });

  test("redirects www to the apex and keeps the query string", () => {
    const event = request("/latest/running-10-agent-ai-org", {
      headers: { host: { value: "WWW.eribertolopez.com" } },
      querystring: {
        ref: { value: "nl" },
        tag: { value: "a", multiValue: [{ value: "a" }, { value: "b c" }] },
      },
    });
    const result = handler(event);
    expect(result.statusCode).toBe(301);
    expect(result.headers?.location?.value).toBe(
      "https://eribertolopez.com/latest/running-10-agent-ai-org?ref=nl&tag=a&tag=b%20c"
    );
    expect(event.request.uri).toBe("/latest/running-10-agent-ai-org");
  });
});

describe("CloudFront custom domain", () => {
  const outDir = path.resolve(__dirname, "../../frontend/out");

  beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, ".synth-placeholder"), "placeholder\n");
  });

  test("prod waits for a us-east-1 certificate before attaching the domain", () => {
    withEnv({}, () => {
      const config = getCloudFrontConfig("prod");
      expect(config.customDomains).toEqual(["eribertolopez.com", "www.eribertolopez.com"]);
      expect(certificateAttachment(config)).toBe("pending-certificate");

      const template = synthFrontend("prod", "us-west-2");
      const distribution = distributionConfig(template);
      expect(distribution.Aliases).toBeUndefined();
      expect(distribution.ViewerCertificate?.AcmCertificateArn).toBeUndefined();
      expect(template.toJSON().Outputs.CustomDomainAttachment.Value).toBe("pending-certificate");
      expect(template.toJSON().Outputs.SiteDomainNames.Value).toBe(
        "eribertolopez.com,www.eribertolopez.com"
      );
      expect(template.toJSON().Outputs.DistributionDomainName.Value).toBeDefined();
      expect(JSON.stringify(template.toJSON())).not.toContain("AWS::Route53::");
      expect(template.findResources("AWS::CertificateManager::Certificate")).toEqual({});
    });
  });

  test("a blank certificate ARN is treated as unset", () => {
    withEnv({ CLOUDFRONT_CERTIFICATE_ARN: "   " }, () => {
      expect(getCloudFrontConfig("prod").certificateArn).toBeUndefined();
      expect(certificateAttachment(getCloudFrontConfig("prod"))).toBe("pending-certificate");
    });
  });

  test("prod domain list is not replaced by CLOUDFRONT_CUSTOM_DOMAIN", () => {
    withEnv({ CLOUDFRONT_CUSTOM_DOMAIN: "example.com" }, () => {
      expect(getCloudFrontConfig("prod").customDomains).toEqual([
        "eribertolopez.com",
        "www.eribertolopez.com",
      ]);
      expect(getCloudFrontConfig("dev").customDomains).toEqual(["example.com"]);
    });
  });

  test("imports a us-east-1 certificate onto the distribution in any stack region", () => {
    withEnv({ CLOUDFRONT_CERTIFICATE_ARN: CERT_ARN }, () => {
      const template = synthFrontend("prod", "us-west-2");
      const distribution = distributionConfig(template);
      const viewerCertificate = distribution.ViewerCertificate;
      expect(distribution.Aliases).toEqual(["eribertolopez.com", "www.eribertolopez.com"]);
      expect(viewerCertificate?.AcmCertificateArn).toBe(CERT_ARN);
      expect(viewerCertificate?.SslSupportMethod).toBe("sni-only");
      expect(viewerCertificate?.MinimumProtocolVersion).toBe("TLSv1.2_2021");
      expect(template.toJSON().Outputs.CustomDomainAttachment.Value).toBe("attached");
      expect(template.toJSON().Outputs.CertificateArn.Value).toBe(CERT_ARN);
      expect(template.findResources("AWS::CertificateManager::Certificate")).toEqual({});
      expect(template.findResources("AWS::Route53::HostedZone")).toEqual({});
      expect(template.findResources("AWS::Route53::RecordSet")).toEqual({});

      const functions = template.findResources("AWS::CloudFront::Function");
      const code = Object.values(functions)[0].Properties?.FunctionCode as string;
      expect(code).toContain("eribertolopez.com");
      expect(code).toContain(".html");
      expect(code).not.toContain("__APEX_DOMAIN__");
      expect(JSON.stringify(template.toJSON())).toContain("CNAME");
    });
  });

  test("dev ignores the certificate ARN and does not take the apex", () => {
    withEnv({ CLOUDFRONT_CERTIFICATE_ARN: CERT_ARN }, () => {
      const template = synthFrontend("dev");
      expect(distributionConfig(template).Aliases).toBeUndefined();
      expect(template.toJSON().Outputs.CustomDomainAttachment.Value).toBe("not-configured");
    });
  });

  test("rejects a certificate outside us-east-1", () => {
    withEnv(
      {
        CLOUDFRONT_CERTIFICATE_ARN:
          "arn:aws:acm:us-west-2:123456789012:certificate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      },
      () => {
        expect(() => synthFrontend("prod")).toThrow(/us-east-1/);
      }
    );
  });
});

function distributionConfig(template: Template): {
  Aliases?: string[];
  ViewerCertificate?: {
    CloudFrontDefaultCertificate?: boolean;
    AcmCertificateArn?: string;
    SslSupportMethod?: string;
    MinimumProtocolVersion?: string;
  };
} {
  const resources = template.findResources("AWS::CloudFront::Distribution");
  const distribution = Object.values(resources)[0] as {
    Properties: {
      DistributionConfig: {
        Aliases?: string[];
        ViewerCertificate: {
          CloudFrontDefaultCertificate?: boolean;
          AcmCertificateArn?: string;
          SslSupportMethod?: string;
          MinimumProtocolVersion?: string;
        };
      };
    };
  };
  return distribution.Properties.DistributionConfig;
}
