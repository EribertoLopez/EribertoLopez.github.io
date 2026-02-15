import path from "path";
import * as fs from "fs";


export function deploymentTarget(target: "frontend" | "backend" | "all" | undefined) {
  switch (target) {
    case "frontend":
      return {
        deployBackend: false,
        deployFrontend: true
      };
    case "backend":
        return {
            deployBackend: true,
            deployFrontend: false
        }
    case "all":
        return {
            deployBackend: true,
            deployFrontend: true
        }
    case undefined:
        return {
            deployBackend: true,
            deployFrontend: true
        }
  }
}


interface SubnetInfo {
    id: string;
    az: string;
  }
  
  interface SubnetGroup {
    subnet1: SubnetInfo;
    subnet2: SubnetInfo;
  }
  
  interface Subnets {
    public: SubnetGroup;
    privateApp: SubnetGroup;
    privateData: SubnetGroup;
  }
  
  interface SecurityGroups {
    lambda: string;
    rds: string;
    alb: string;
    ecsEc2: string;
  }
  
  interface NatGateways {
    natGw1: string;
    natGw2: string;
  }
  
  export interface VPCEnvironmentConfig {
    vpcId: string;
    vpcCidr: string;
    vpcName: string;
    availabilityZones: string[];
    subnets: Subnets;
    securityGroups: SecurityGroups;
    natGateways: NatGateways;
  }
  
export interface VPCConfig {
    vpcConfig: {
      [environment: string]: VPCEnvironmentConfig;
    };
  }

export const unifiedVPCConfig = (environment: string) => {
    let vpcConfig: VPCConfig | undefined;
    let envVpcConfig: VPCEnvironmentConfig | undefined;

    if (environment === "local") {
        // LOCAL: Load from file
        const vpcConfigPath = path.join(__dirname, "vpc-local-config.json");
        if (fs.existsSync(vpcConfigPath)) {
            try {
                const configData = fs.readFileSync(vpcConfigPath, "utf-8");
                vpcConfig = JSON.parse(configData) as VPCConfig;
                envVpcConfig = vpcConfig?.vpcConfig?.[environment];
                console.log(`[LOCAL] Loaded VPC configuration from ${vpcConfigPath}`);
            } catch (error) {
                console.warn(`[LOCAL] Failed to load VPC configuration from file: ${error}`);
                throw new Error(`[LOCAL] Failed to load VPC configuration from file: ${error}`);
            }
        } else {
            console.log(`[LOCAL] No VPC config file found at ${vpcConfigPath}, will create new VPC`);
        }
    } else {
        // CI/CD: Load from environment variable
        const vpcConfigEnv = process.env.INTERNAL_VPC_CONFIG;
        if (vpcConfigEnv) {
            try {
                vpcConfig = JSON.parse(vpcConfigEnv) as VPCConfig;
                envVpcConfig = vpcConfig?.vpcConfig?.[environment];
                console.log(`[CI/CD] Loaded VPC configuration from INTERNAL_VPC_CONFIG environment variable`);
                console.log(`[CI/CD] Using VPC: ${envVpcConfig?.vpcId || 'Not found for environment'}`);
            } catch (error) {
                console.error(`[CI/CD] Failed to parse INTERNAL_VPC_CONFIG: ${error}`);
                console.error(`[CI/CD] Received value: ${vpcConfigEnv?.substring(0, 100)}...`);
                throw new Error("Invalid INTERNAL_VPC_CONFIG format. Must be valid JSON.");
            }
        } else {
            console.log(`[CI/CD] No INTERNAL_VPC_CONFIG environment variable found, will create new VPC`);
        }
    }
    return {
        envVpcConfig
    };
}

export const databaseConfig = () => {
    return {
        databaseUsername: process.env.DB_USERNAME || "postgres",
        databasePassword: process.env.DB_PASSWORD || "postgres",
        databaseName: process.env.DB_NAME || "eribertolopez"
    };
}

export const cacheConfig = () => {
    return {
        cacheNodeType: process.env.CACHE_NODE_TYPE || "cache.t3.micro",
        cacheNumNodes: parseInt(process.env.CACHE_NUM_NODES || "1"),
        enableCacheBackups: process.env.ENABLE_CACHE_BACKUPS === "true"
    };
}

export const originDataConfig = () => {
    return {
        originDataAWSRegion: process.env.ORIGIN_DATA_AWS_REGION || "",
        originDataAWSAccessKeyId: process.env.ORIGIN_DATA_AWS_ACCESS_KEY_ID || "",
        originDataAWSSecretAccessKey: process.env.ORIGIN_DATA_AWS_SECRET_ACCESS_KEY || "",
        originDataS3BucketName: process.env.ORIGIN_DATA_S3_BUCKET_NAME || ""
    };
}

export const proxyConfig = () => {
    // dbProxyArn: `arn:aws:rds:${this.region}:${this.account}:db-proxy:${environment}-internal-apps-rds-proxy`,
    // dbProxyName: `${environment}-internal-apps-rds-proxy`,
    // endpoint: `${environment}-internal-apps-rds-proxy.proxy-cci5ve8kwd07.us-west-1.rds.amazonaws.com`,
    const internalAppsProxyConfig = JSON.parse(process.env.INTERNAL_APPS_PROXY_CONFIG || "{}");
    return {
        dbProxyArn: internalAppsProxyConfig.dbProxyArn || "arn:aws:rds:us-west-1:000000000000:db-proxy:local-internal-apps-rds-proxy",
        dbProxyName: internalAppsProxyConfig.dbProxyName || "local-internal-apps-rds-proxy",
        endpoint: internalAppsProxyConfig.endpoint || "local-internal-apps-rds-proxy.proxy-cci5ve8kwd07.us-west-1.rds.amazonaws.com",
        proxyPort: parseInt(internalAppsProxyConfig.proxyPort || "5432"),
    };
}

export const internalAppsDBConfig = () => {
    const databaseSecret = JSON.parse(process.env.INTERNAL_APPS_DATABASE_SECRET || "{}");
    return {
        username: databaseSecret.username || "postgres",
        password: databaseSecret.password || "postgres",
        engine: databaseSecret.engine || "postgres",
        host: databaseSecret.host || "localhost",
        port: parseInt(databaseSecret.port || "5432"),
        clusterIdentifier: databaseSecret.clusterIdentifier || "local-internal-apps-database-cluster",
        databaseName: databaseSecret.databaseName || "eribertolopez"
    }
    // return {
    //     username: process.env.INTERNAL_APPS_DATABASE_USERNAME || "postgres",
    //     password: process.env.INTERNAL_APPS_DATABASE_PASSWORD || "postgres",
    //     engine: process.env.INTERNAL_APPS_DATABASE_ENGINE || "postgres",
    //     host: process.env.INTERNAL_APPS_DATABASE_HOST || "localhost",
    //     port: parseInt(process.env.INTERNAL_APPS_DATABASE_PORT || "5432"),
    //     clusterIdentifier: process.env.INTERNAL_APPS_DATABASE_CLUSTER_IDENTIFIER || "local-internal-apps-database-cluster",
    //     databaseName: process.env.INTERNAL_APPS_DATABASE_NAME || "eribertolopez"
    // };
}