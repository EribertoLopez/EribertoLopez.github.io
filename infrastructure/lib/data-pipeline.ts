import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { VpcStack } from "./vpc";

export interface DataPipelineStackProps extends cdk.StackProps {
  environment: string;
  vpcStack: VpcStack;
}

export class DataPipelineStack extends cdk.Stack {
  public dataBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: DataPipelineStackProps) {
    super(scope, id, props);

    const { environment } = props;
    this.createDataBucket(environment);
  }

  private createDataBucket(environment: string) {
    this.dataBucket = new s3.Bucket(this, "DataPipelineBucket", {
      bucketName: `fundascholar-${environment}-data-pipeline`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: "DeleteOldFiles",
          enabled: false,
          expiration: cdk.Duration.days(30),
        },
      ],
    });

    // Output bucket name
    new cdk.CfnOutput(this, "DataPipelineBucketName", {
      exportName: `fundascholar-${environment}-data-pipeline-bucket-name`,
      description: "Name of the data pipeline bucket with S3 event notifications",
      value: this.dataBucket.bucketName,
    });
  }

}
