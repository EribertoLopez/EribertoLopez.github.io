import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { VpcStack } from "./vpc";
import { NamingConvention } from "../bin/naming";
import { ProjectConfig } from "../bin/project-config";

export interface DataPipelineStackProps extends cdk.StackProps {
  environment: string;
  projectConfig: ProjectConfig;
  naming: NamingConvention;
  vpcStack: VpcStack;
}

export class DataPipelineStack extends cdk.Stack {
  public dataBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: DataPipelineStackProps) {
    super(scope, id, props);

    const { environment, naming, projectConfig } = props;
    this.createDataBucket(environment, naming);

    cdk.Tags.of(this).add("Project", projectConfig.projectDisplayName);
    cdk.Tags.of(this).add("Environment", environment);
  }

  private createDataBucket(environment: string, naming: NamingConvention) {
    this.dataBucket = new s3.Bucket(this, "DataPipelineBucket", {
      bucketName: naming.bucketName("data-pipeline"),
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{
        id: "DeleteOldFiles",
        enabled: false,
        expiration: cdk.Duration.days(30),
      }],
    });

    new cdk.CfnOutput(this, "DataPipelineBucketName", {
      exportName: naming.cloudfrontExportName("data-pipeline-bucket-name"),
      description: "Name of the data pipeline bucket with S3 event notifications",
      value: this.dataBucket.bucketName,
    });
  }
}

