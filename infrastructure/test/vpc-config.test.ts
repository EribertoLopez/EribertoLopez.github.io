import * as cdk from "aws-cdk-lib";
import { VpcStack } from "../lib/vpc";
import { unifiedVPCConfig } from "../bin/env-config";

describe("deployed VPC config", () => {
  const original = process.env.INTERNAL_VPC_CONFIG;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.INTERNAL_VPC_CONFIG;
    } else {
      process.env.INTERNAL_VPC_CONFIG = original;
    }
  });

  test("returns no config when INTERNAL_VPC_CONFIG is unset", () => {
    delete process.env.INTERNAL_VPC_CONFIG;
    const { envVpcConfig } = unifiedVPCConfig("dev");
    expect(envVpcConfig).toBeUndefined();
  });

  test("reads the environment key from INTERNAL_VPC_CONFIG", () => {
    process.env.INTERNAL_VPC_CONFIG = JSON.stringify({
      vpcConfig: {
        dev: { vpcId: "vpc-abc" },
      },
    });
    const { envVpcConfig } = unifiedVPCConfig("dev");
    expect(envVpcConfig?.vpcId).toBe("vpc-abc");
  });

  test("throws a clear error instead of reading vpcId on undefined", () => {
    const app = new cdk.App();
    expect(() => {
      new VpcStack(app, "VpcMissingConfig", {
        environment: "dev",
        isLocalEnvironment: false,
      });
    }).toThrow(/INTERNAL_VPC_CONFIG/);
  });
});
