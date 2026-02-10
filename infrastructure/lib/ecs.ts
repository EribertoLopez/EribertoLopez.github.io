import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";

import { VpcStack } from "./vpc";
import { S3EventSourceV2 } from "aws-cdk-lib/aws-lambda-event-sources";
import { internalAppsDBConfig } from "../bin/env-config";
import { NamingConvention } from "../bin/naming";
import { ProjectConfig } from "../bin/project-config";

const DATA_PIPELINE_BUCKET_SCHOLAR_IMAGES_FOLDER = "scholar-profile-images";

export interface ECSStackProps extends cdk.StackProps {
  environment: string;
  vpcStack: VpcStack;
  tenantIdentifier: string;
  projectConfig: ProjectConfig;
  naming: NamingConvention;
  originDataAWSRegion: string;
  originDataAWSAccessKeyId: string;
  originDataAWSSecretAccessKey: string;
  originDataS3BucketName: string;
  redisHost: string;
  redisPort: string;
  baseUrl: string;
  artilleryKey: string;
}

// TODO: This comes from a previous project (Fund-A-Scholar) and should be refactored to be more generic.
export class ECSStack extends cdk.Stack {
  private _cluster!: ecs.Cluster;
  private _taskDefinition!: ecs.FargateTaskDefinition;
  private _service!: ecs.FargateService;
  private _taskDefinitionArn!: string;
  private _containerName!: string;
  private _clusterArn!: string;
  private _originDataAWSRegion!: string;
  private _originDataAWSAccessKeyId!: string;
  private _originDataAWSSecretAccessKey!: string;
  private _originDataS3BucketName!: string;
  private _redisHost!: string;
  private _redisPort!: string;
  private _prosperFasBucketName!: string;
  private _prosperFasObjectKeyPrefix!: string;
  private _prosperFasAWSRegion!: string;
  private _baseUrl!: string;
  private _artilleryKey!: string;
  private _naming!: NamingConvention;
  private _projectConfig!: ProjectConfig;
  public processingLambda?: lambda.Function;
  public dataBucket?: s3.Bucket;
  public cloudfrontDistribution?: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: ECSStackProps) {
    super(scope, id, props);

    const {
      environment,
      vpcStack,
      tenantIdentifier,
      projectConfig,
      naming,
      originDataAWSRegion,
      originDataAWSAccessKeyId,
      originDataAWSSecretAccessKey,
      originDataS3BucketName,
      redisHost,
      redisPort,
      baseUrl,
      artilleryKey,
    } = props;

    this._naming = naming;
    this._projectConfig = projectConfig;
    this._originDataAWSRegion = originDataAWSRegion;
    this._originDataAWSAccessKeyId = originDataAWSAccessKeyId;
    this._originDataAWSSecretAccessKey = originDataAWSSecretAccessKey;
    this._originDataS3BucketName = originDataS3BucketName;
    this._redisHost = redisHost;
    this._redisPort = redisPort;
    this._baseUrl = baseUrl;
    this._artilleryKey = artilleryKey;
    
    // TODO: Very specific to Fund-A-Scholar - should be refactored to be more generic.
    this._prosperFasBucketName = `${projectConfig.projectSlug}-prosper-${environment}-data-pipeline`;
    this._prosperFasObjectKeyPrefix = `incoming/scholar-data/hsf`;
    this._prosperFasAWSRegion = `us-west-1`;

    // Use provided image URI or construct from ECR repository
    const eltImageUri =
      cdk.Fn.importValue(
        `${projectConfig.projectSlug}-data-${props.environment}-ELTServiceECRRepositoryUri`
      ) + ":latest";

    const loadTestingImageUri =
      cdk.Fn.importValue(
        `${projectConfig.projectSlug}-load-testing-${props.environment}-LoadTestingServiceECRRepositoryUri`
      ) + ":latest";

    // Create data bucket
    this.createDataBucket(environment);

    // Create ECS resources
    const {
      loadTestingService,
      loadTestingTaskDefinition,
      loadTestingContainer,
    } = this.createECSResources({
      environment,
      vpcStack,
      dataPipelineBucket: this.dataBucket!,
      eltImageUri: eltImageUri,
      loadTestingImageUri: loadTestingImageUri,
      cloudfrontDistribution: this.cloudfrontDistribution!,
      redisHost: this._redisHost,
      redisPort: this._redisPort,
      baseUrl: this._baseUrl,
      artilleryKey: this._artilleryKey,
    });

    // Create Lambda after ECS resources are created
    this.createProcessingLambda(
      environment,
      vpcStack,
      this.dataBucket!,
      tenantIdentifier
    );

    this.createLoadTestingLambda({
      environment,
      vpcStack,
      loadTestingService,
      loadTestingTaskDefinition,
      loadTestingContainer,
    });
  }

  private createDataBucket(environment: string) {
    this.dataBucket = new s3.Bucket(this, "DataPipelineBucket", {
      bucketName: this._naming.bucketName("data-pipeline"),
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

    // 2. Cache policy for profile images
    const imageCachePolicy = new cloudfront.CachePolicy(
      this,
      "ScholarImagesCachePolicy",
      {
        defaultTtl: cdk.Duration.days(30),
        minTtl: cdk.Duration.hours(1),
        maxTtl: cdk.Duration.days(365),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
      }
    );

    // 3. CloudFront distribution (using OAC implicitly)
    const s3Origin = new S3Origin(this.dataBucket);

    this.cloudfrontDistribution = new cloudfront.Distribution(
      this,
      "ScholarImagesDistribution",
      {
        defaultBehavior: {
          origin: s3Origin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        },
        additionalBehaviors: {
          [`${DATA_PIPELINE_BUCKET_SCHOLAR_IMAGES_FOLDER}/*`]: {
            origin: s3Origin,
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: imageCachePolicy,
          },
        },
        comment: "Public CDN for scholar-profile-images only",
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      }
    );

    // 4. Restrict bucket so CloudFront can only read scholar-profile-images/*
    this.dataBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [this.dataBucket.arnForObjects("scholar-profile-images/*")],
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        conditions: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${this.account}:distribution/${this.cloudfrontDistribution.distributionId}`,
          },
        },
      })
    );

    // get cdn url

    // Output bucket name
    new cdk.CfnOutput(this, "DataPipelineBucketName", {
      exportName: this._naming.cloudfrontExportName("data-pipeline-bucket-name"),
      description:
        "Name of the data pipeline bucket with S3 event notifications",
      value: this.dataBucket.bucketName,
    });

    new cdk.CfnOutput(this, "ScholarImagesDistributionId", {
      exportName: this._naming.cloudfrontExportName("scholar-images-distribution-id"),
      description: "ID of the scholar images distribution",
      value: this.cloudfrontDistribution.distributionId,
    });
  }

  // Getters for readonly properties
  public get cluster(): ecs.Cluster {
    return this._cluster;
  }

  public get taskDefinition(): ecs.FargateTaskDefinition {
    return this._taskDefinition;
  }

  public get service(): ecs.FargateService {
    return this._service;
  }

  public get taskDefinitionArn(): string {
    return this._taskDefinitionArn;
  }

  public get containerName(): string {
    return this._containerName;
  }

  public get clusterArn(): string {
    return this._clusterArn;
  }

  private createECSResources({
    environment,
    vpcStack,
    dataPipelineBucket,
    eltImageUri,
    loadTestingImageUri,
    cloudfrontDistribution,
    redisHost,
    redisPort,
    baseUrl,
    artilleryKey,
  }: {
    environment: string;
    vpcStack: VpcStack;
    dataPipelineBucket: s3.Bucket;
    eltImageUri: string;
    loadTestingImageUri: string;
    cloudfrontDistribution: cloudfront.Distribution;
    redisHost: string;
    redisPort: string;
    baseUrl: string;
    artilleryKey: string;
  }) {
    // Create ECS Cluster
    this._cluster = new ecs.Cluster(this, `${this._projectConfig.projectName}Cluster`, {
      clusterName: `${this._projectConfig.projectSlug}-data-${environment}-cluster`,
      vpc: vpcStack.vpc,
    });

    this.createELTService({
      environment,
      imageUri: eltImageUri,
      dataPipelineBucket,
      cloudfrontDistribution,
      redisHost,
      redisPort,
      vpcStack,
    });

    const {
      loadTestingService,
      loadTestingTaskDefinition,
      loadTestingContainer,
    } = this.createLoadTestingService({
      environment,
      imageUri: loadTestingImageUri,
      baseUrl,
      artilleryKey,
      vpcStack,
    });

    // Add tags
    cdk.Tags.of(this).add("Project", this._projectConfig.projectDisplayName);
    cdk.Tags.of(this).add("Environment", environment);

    return {
      eltService: this._service,
      eltTaskDefinition: this._taskDefinition,
      eltContainer: this._containerName,
      loadTestingService: loadTestingService,
      loadTestingTaskDefinition: loadTestingTaskDefinition,
      loadTestingContainer: loadTestingContainer,
    };
  }

  private createELTService({
    environment,
    imageUri,
    dataPipelineBucket,
    cloudfrontDistribution,
    redisHost,
    redisPort,
    vpcStack,
  }: {
    environment: string;
    imageUri: string;
    dataPipelineBucket: s3.Bucket;
    cloudfrontDistribution: cloudfront.Distribution;
    redisHost: string;
    redisPort: string;
    vpcStack: VpcStack;
  }) {
    // Create CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, "ELTServiceLogGroup", {
      logGroupName: this._naming.ecsLogGroupName("elt"),
      retention: logs.RetentionDays.INFINITE,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Create Task Definition
    this._taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "ELTServiceTaskDef",
      {
        family: `elt-task-def-${environment}`,
        cpu: 1024,
        memoryLimitMiB: 4096,
        executionRole: new iam.Role(this, "ELTServiceExecutionRole", {
          assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName(
              "service-role/AmazonECSTaskExecutionRolePolicy"
            ),
          ],
        }),
      }
    );

    // Add S3 permissions to task role (read/write data pipeline bucket)
    (this._taskDefinition.taskRole as iam.Role).addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ],
        resources: ["*"],
      })
    );

    // Add CloudWatch Logs permissions
    (this._taskDefinition.taskRole as iam.Role).addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    );

    // Add Rekognition permissions for image processing
    (this._taskDefinition.taskRole as iam.Role).addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["rekognition:DetectFaces", "rekognition:DetectLabels"],
        resources: ["*"],
      })
    );

    // Add container to task definition
    const { host, port, username, password, databaseName } =
      internalAppsDBConfig();
    const target1DBConnectionString = `postgresql://${username}:${password}@${host}:${port}/${databaseName}`;
    this._containerName = `elt-task-def-${environment}`;
    const container = this._taskDefinition.addContainer("ELTServiceContainer", {
      containerName: this._containerName,
      image: ecs.ContainerImage.fromRegistry(imageUri),
      essential: true,
      environment: {
        TARGET1_DB_CONNECTION_STRING: target1DBConnectionString,
        ENVIRONMENT: environment,
        AWS_REGION: this.region,
        DATA_PIPELINE_BUCKET_NAME: dataPipelineBucket.bucketName,
        DATA_PIPELINE_BUCKET_SCHOLAR_IMAGES_FOLDER:
          DATA_PIPELINE_BUCKET_SCHOLAR_IMAGES_FOLDER,
        DATA_PIPELINE_CDN_URL: cloudfrontDistribution.distributionDomainName,
        ORIGIN_DATA_AWS_REGION: this._originDataAWSRegion,
        ORIGIN_DATA_AWS_ACCESS_KEY_ID: this._originDataAWSAccessKeyId,
        ORIGIN_DATA_AWS_SECRET_ACCESS_KEY: this._originDataAWSSecretAccessKey,
        ORIGIN_DATA_S3_BUCKET_NAME: this._originDataS3BucketName,
        PROSPER_FAS_BUCKET_NAME: this._prosperFasBucketName,
        PROSPER_FAS_OBJECT_KEY_PREFIX: this._prosperFasObjectKeyPrefix,
        FAS_PROSPER_AWS_REGION: this._prosperFasAWSRegion,
        REDIS_HOST: redisHost,
        REDIS_PORT: redisPort,
        REDIS_TLS_ENABLED: "true",
        // Note: PROCESSING_TYPE, S3_BUCKET_NAME, S3_OBJECT_KEY will be set by Lambda when launching tasks
      },
      logging: ecs.LogDrivers.awsLogs({
        logGroup: logGroup,
        streamPrefix: "ELTService",
      }),
      portMappings: [
        {
          containerPort: 80,
          protocol: ecs.Protocol.TCP,
        },
      ],
    });

    // Create ECS Service
    this._service = new ecs.FargateService(this, "ELTService", {
      cluster: this._cluster,
      serviceName: `elt-service-${environment}`,
      taskDefinition: this._taskDefinition,
      desiredCount: 0,
      enableECSManagedTags: false,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      vpcSubnets: {
        subnets: [vpcStack.privateAppSubnet1, vpcStack.privateAppSubnet2],
      },
      securityGroups: [
        vpcStack.ec2EcsSecurityGroup,
        vpcStack.lambdaSecurityGroup, // CrossVPCSecurityGroupId equivalent
      ],
      assignPublicIp: true, // TODO: do we need this?
    });

    // Create SSM Parameters
    new ssm.StringParameter(this, "ELTServiceTaskDefParameter", {
      parameterName: `/${this._projectConfig.projectSlug}-data/${environment}/elt-task-def-arn`,
      stringValue: this._taskDefinition.taskDefinitionArn,
      description: "ELT Service Task Definition ARN",
    });

    new ssm.StringParameter(this, "ELTServiceContainerNameParameter", {
      parameterName: `/${this._projectConfig.projectSlug}-data/${environment}/elt-container-name`,
      stringValue: this._containerName,
      description: "ELT Service Container Name",
    });

    // Set public properties
    this._taskDefinitionArn = this._taskDefinition.taskDefinitionArn;
    this._clusterArn = this._cluster.clusterArn;

    // Create outputs
    new cdk.CfnOutput(this, "ELTServiceTaskDefArn", {
      description: "ARN of the ELT Service Task Definition",
      value: this._taskDefinition.taskDefinitionArn,
      exportName: `${cdk.Stack.of(this).stackName}-ELTServiceTaskDefArn`,
    });

    new cdk.CfnOutput(this, "ELTServiceContainerName", {
      description: "Name of the ELT Service Container",
      value: this._containerName,
      exportName: `${cdk.Stack.of(this).stackName}-ELTServiceContainerName`,
    });
  }

  private createLoadTestingService({
    environment,
    imageUri,
    baseUrl,
    artilleryKey,
    vpcStack,
  }: {
    environment: string;
    imageUri: string;
    baseUrl: string;
    artilleryKey: string;
    vpcStack: VpcStack;
  }): {
    loadTestingService: ecs.FargateService;
    loadTestingTaskDefinition: ecs.FargateTaskDefinition;
    loadTestingContainer: ecs.ContainerDefinition;
  } {
    // Create CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, "LoadTestingServiceLogGroup", {
      logGroupName: `/${this._projectConfig.projectSlug}-load-testing-${environment}-log-group`,
      retention: logs.RetentionDays.INFINITE,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Create Task Definition - sized for high load testing (1000+ RPS)
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "LoadTestingServiceTaskDef",
      {
        family: `load-testing-task-def-${environment}`,
        cpu: 8192, // 8 vCPU for handling 1000+ RPS load generation
        memoryLimitMiB: 16384, // 16 GB for concurrent connections and metrics
        executionRole: new iam.Role(this, "LoadTestingServiceExecutionRole", {
          assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName(
              "service-role/AmazonECSTaskExecutionRolePolicy"
            ),
          ],
        }),
      }
    );

    // Add CloudWatch Logs permissions
    (taskDefinition.taskRole as iam.Role).addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    );

    // Add container to task definition
    const containerName = `load-testing-task-def-${environment}`;
    const container = taskDefinition.addContainer(
      "LoadTestingServiceContainer",
      {
        containerName: containerName,
        image: ecs.ContainerImage.fromRegistry(imageUri),
        essential: true,
        environment: {
          ENVIRONMENT: environment,
          AWS_REGION: this.region,
          BASE_URL: baseUrl,
          ARTILLERY_KEY: artilleryKey,
          POSTHOG_DISABLED: "true",
          ARTILLERY_TELEMETRY: "0",
          NODE_ENV: "performance-test",
          ARTILLERY_WORKERS: "16",
        },
        logging: ecs.LogDrivers.awsLogs({
          logGroup: logGroup,
          streamPrefix: "LoadTestingService",
        }),
        portMappings: [
          {
            containerPort: 80,
            protocol: ecs.Protocol.TCP,
          },
        ],
      }
    );

    // Create ECS Service
    const service = new ecs.FargateService(this, "LoadTestingService", {
      cluster: this._cluster,
      serviceName: `load-testing-service-${environment}`,
      taskDefinition: taskDefinition,
      desiredCount: 0,
      enableECSManagedTags: false,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      vpcSubnets: {
        subnets: [vpcStack.privateAppSubnet1, vpcStack.privateAppSubnet2],
      },
      securityGroups: [
        vpcStack.ec2EcsSecurityGroup,
        vpcStack.lambdaSecurityGroup, // CrossVPCSecurityGroupId equivalent
      ],
      assignPublicIp: true, // TODO: do we need this?
    });

    // Create SSM Parameters
    new ssm.StringParameter(this, "LoadTestingServiceTaskDefParameter", {
      parameterName: `/${this._projectConfig.projectSlug}-load-testing/${environment}/load-testing-task-def-arn`,
      stringValue: taskDefinition.taskDefinitionArn,
      description: "Load Testing Service Task Definition ARN",
    });

    new ssm.StringParameter(this, "LoadTestingServiceContainerNameParameter", {
      parameterName: `/${this._projectConfig.projectSlug}-load-testing/${environment}/load-testing-container-name`,
      stringValue: containerName,
      description: "Load Testing Service Container Name",
    });

    // Create outputs
    new cdk.CfnOutput(this, "LoadTestingServiceTaskDefArn", {
      description: "ARN of the Load Testing Service Task Definition",
      value: taskDefinition.taskDefinitionArn,
      exportName: `${
        cdk.Stack.of(this).stackName
      }-LoadTestingServiceTaskDefArn`,
    });

    new cdk.CfnOutput(this, "LoadTestingServiceContainerName", {
      description: "Name of the Load Testing Service Container",
      value: containerName,
      exportName: `${
        cdk.Stack.of(this).stackName
      }-LoadTestingServiceContainerName`,
    });

    return {
      loadTestingService: service,
      loadTestingTaskDefinition: taskDefinition,
      loadTestingContainer: container,
    };
  }

  private createProcessingLambda(
    environment: string,
    vpcStack: VpcStack,
    dataPipelineBucket: s3.Bucket,
    tenantIdentifier: string
  ) {
    this.processingLambda = new lambda.Function(this, "DataProcessingLambda", {
      functionName: `${this._projectConfig.projectSlug}-${environment}-data-processor`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "data-processor.handler",
      code: lambda.Code.fromAsset("../backend/dist"),
      timeout: cdk.Duration.minutes(15),
      memorySize: 128,
      environment: {
        ENVIRONMENT: environment,
        ECS_CLUSTER_ARN: this.clusterArn,
        ECS_TASK_DEFINITION_ARN: this.taskDefinitionArn,
        CONTAINER_NAME: this._containerName,
        SUBNETS: JSON.stringify([
          vpcStack.privateAppSubnet1.subnetId,
          vpcStack.privateAppSubnet2.subnetId,
        ]),
        SECURITY_GROUPS: JSON.stringify([
          vpcStack.ec2EcsSecurityGroup.securityGroupId,
          vpcStack.lambdaSecurityGroup.securityGroupId,
        ]),
      },
    });

    // Grant Lambda permissions to access S3
    dataPipelineBucket.grantRead(this.processingLambda);
    dataPipelineBucket.grantWrite(this.processingLambda);

    // Grant Lambda permissions to launch ECS tasks
    this.processingLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ecs:RunTask", "ecs:DescribeTasks"],
        resources: ["*"],
      })
    );

    // Grant Lambda permission to pass IAM roles to ECS tasks
    // No circular dependency since we're in the same stack now
    this.processingLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [
          this.taskDefinition.taskRole.roleArn,
          this.taskDefinition.executionRole!.roleArn,
        ],
      })
    );

    // add event source to the lambda s3 bucket
    this.processingLambda.addEventSource(
      new S3EventSourceV2(dataPipelineBucket as s3.Bucket, {
        events: [s3.EventType.OBJECT_CREATED],
        filters: [
          {
            prefix: `${tenantIdentifier}/incoming/scholar-data/`,
            suffix: ".csv",
          },
        ],
      })
    );

    this.processingLambda.addEventSource(
      new S3EventSourceV2(dataPipelineBucket as s3.Bucket, {
        events: [s3.EventType.OBJECT_CREATED],
        filters: [
          {
            prefix: `${tenantIdentifier}/incoming/deactivation-requests/`,
            suffix: ".txt",
          },
        ],
      })
    );

    // Output Lambda function ARN
    new cdk.CfnOutput(this, "DataProcessingLambdaArn", {
      exportName: `${this._projectConfig.projectSlug}-${environment}-data-processor-lambda-arn`,
      description: "ARN of the data processing Lambda function",
      value: this.processingLambda.functionArn,
    });
  }

  private createLoadTestingLambda({
    environment,
    vpcStack,
    loadTestingService,
    loadTestingTaskDefinition,
    loadTestingContainer,
  }: {
    environment: string;
    vpcStack: VpcStack;
    loadTestingService: ecs.FargateService;
    loadTestingTaskDefinition: ecs.FargateTaskDefinition;
    loadTestingContainer: ecs.ContainerDefinition;
  }) {
    const loadTestingLambda = new lambda.Function(this, "LoadTestingLambda", {
      functionName: `${this._projectConfig.projectSlug}-${environment}-load-testing`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "trigger-load-testing.handler",
      code: lambda.Code.fromAsset("../backend/dist"),
      timeout: cdk.Duration.minutes(15),
      memorySize: 128,
      environment: {
        ENVIRONMENT: environment,
        ECS_CLUSTER_ARN: loadTestingService.cluster.clusterArn,
        ECS_TASK_DEFINITION_ARN: loadTestingTaskDefinition.taskDefinitionArn,
        CONTAINER_NAME: loadTestingContainer.containerName,
        SUBNETS: JSON.stringify([
          vpcStack.privateAppSubnet1.subnetId,
          vpcStack.privateAppSubnet2.subnetId,
        ]),
        SECURITY_GROUPS: JSON.stringify([
          vpcStack.ec2EcsSecurityGroup.securityGroupId,
          vpcStack.lambdaSecurityGroup.securityGroupId,
        ]),
      },
    });

    // Grant Lambda permissions to launch ECS tasks
    loadTestingLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ecs:RunTask", "ecs:DescribeTasks"],
        resources: ["*"],
      })
    );

    // Grant Lambda permission to pass IAM roles to ECS tasks
    // No circular dependency since we're in the same stack now
    loadTestingLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [
          loadTestingTaskDefinition.taskRole.roleArn,
          loadTestingTaskDefinition.executionRole!.roleArn,
        ],
      })
    );

    // Output Lambda function ARN
    new cdk.CfnOutput(this, "LoadTestingLambdaArn", {
      exportName: `${this._projectConfig.projectSlug}-${environment}-load-testing-lambda-arn`,
      description: "ARN of the load testing Lambda function",
      value: loadTestingLambda.functionArn,
    });
  }
}
