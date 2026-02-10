import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import { LambdaFunctionInfo } from "./lambda";
import { NamingConvention } from "../bin/naming";
import { ProjectConfig } from "../bin/project-config";

export interface MonitoringStackProps extends cdk.StackProps {
  envName: string;
  alertEmail: string;
  projectConfig: ProjectConfig;
  naming: NamingConvention;
  
  // ═══════════════════════════════════════════════════════════════
  // REQUIRED - Lambda Functions Registry (replaces individual names)
  // ═══════════════════════════════════════════════════════════════
  lambdaFunctions: LambdaFunctionInfo[];
  
  // ═══════════════════════════════════════════════════════════════
  // REQUIRED - API Gateway Monitoring
  // ═══════════════════════════════════════════════════════════════
  apiGatewayId: string;
  apiGatewayStageName: string;
  apiGatewayLatencyThreshold?: number;
  
  // ═══════════════════════════════════════════════════════════════
  // CONDITIONAL - Cache Monitoring (only when CacheStack enabled)
  // ═══════════════════════════════════════════════════════════════
  cacheReplicationGroupId?: string;
  cacheCpuThreshold?: number;
  cacheMemoryThreshold?: number;
  cacheConnectionThreshold?: number;
  
  // ═══════════════════════════════════════════════════════════════
  // CONDITIONAL - SQS Monitoring (only when SQSStack enabled)
  // ═══════════════════════════════════════════════════════════════
  deadLetterQueueName?: string;
  dlqMessageThreshold?: number;
  transactionEventsQueueName?: string;
  sqsQueueAgeThreshold?: number;
  
  // Optional threshold configuration
  signatureErrorThreshold?: number;
  generalErrorThreshold?: number;
  evaluationPeriod?: cdk.Duration;
  lambdaThrottleThreshold?: number;
  lambdaConcurrentExecutionThreshold?: number;
  lambdaErrorRateThreshold?: number;
  apiGateway5xxThreshold?: number;
  apiGateway4xxThreshold?: number;
}

export class MonitoringStack extends cdk.Stack {
  public readonly alarmTopic!: sns.Topic;
  public signatureErrorAlarm!: cloudwatch.Alarm;
  public generalErrorAlarm!: cloudwatch.Alarm;
  public readonly lambdaThrottleAlarms: cloudwatch.Alarm[] = [];
  public readonly lambdaConcurrentExecutionAlarms: cloudwatch.Alarm[] = [];
  public readonly lambdaErrorRateAlarms: cloudwatch.Alarm[] = [];
  
  // Store projectConfig for use in all methods
  private readonly projectConfig: ProjectConfig;
  private readonly naming: NamingConvention;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const {
      envName: environment,
      alertEmail,
      projectConfig,
      naming,
      lambdaFunctions,
      apiGatewayId,
      apiGatewayStageName,
      cacheReplicationGroupId,
      deadLetterQueueName,
      transactionEventsQueueName,
      signatureErrorThreshold = 1,
      generalErrorThreshold = 3,
      evaluationPeriod = cdk.Duration.minutes(5),
      lambdaThrottleThreshold = 1,
      lambdaConcurrentExecutionThreshold = 800,
      lambdaErrorRateThreshold = 5,
      apiGateway5xxThreshold = 5,
      apiGateway4xxThreshold = 50,
      apiGatewayLatencyThreshold = 1000,
      cacheCpuThreshold = 75,
      cacheMemoryThreshold = 90,
      cacheConnectionThreshold = 65000,
      dlqMessageThreshold = 1,
      sqsQueueAgeThreshold = 300,
    } = props;
    
    // Store for use in private methods
    this.projectConfig = projectConfig;
    this.naming = naming;

    // Validate required props
    if (!alertEmail) {
      throw new Error("alertEmail is required for MonitoringStack");
    }
    if (!lambdaFunctions || lambdaFunctions.length === 0) {
      throw new Error("lambdaFunctions registry is required and must not be empty");
    }
    if (!apiGatewayId || !apiGatewayStageName) {
      throw new Error("apiGatewayId and apiGatewayStageName are required for MonitoringStack");
    }

    // Create SNS topic for alarm notifications
    this.alarmTopic = new sns.Topic(this, "AlarmTopic", {
      topicName: naming.snsTopicName("alarms"),
      displayName: `${projectConfig.projectDisplayName} ${environment} Alarms`,
    });

    // Add email subscription if provided
    this.alarmTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(alertEmail)
    );

    // ─────────────────────────────────────────────────────────────────
    // AUTOMATIC LAMBDA MONITORING
    // Creates alarms for ALL registered Lambda functions
    // ─────────────────────────────────────────────────────────────────
    lambdaFunctions.forEach((lambdaInfo) => {
      // Create throttling alarm for every Lambda
      this.createLambdaThrottlingAlarm({
        lambdaName: lambdaInfo.functionName,
        displayName: lambdaInfo.id,
        threshold: lambdaThrottleThreshold,
        evaluationPeriod,
      });

      // Create concurrent execution alarm for every Lambda
      this.createLambdaConcurrentExecutionAlarm({
        lambdaName: lambdaInfo.functionName,
        displayName: lambdaInfo.id,
        threshold: lambdaConcurrentExecutionThreshold,
        evaluationPeriod,
      });

      // Create error rate alarm for every Lambda
      this.createLambdaErrorRateAlarm({
        lambdaName: lambdaInfo.functionName,
        displayName: lambdaInfo.id,
        threshold: lambdaErrorRateThreshold,
        evaluationPeriod,
      });

      // Create log-based alarms only for functions that need them
      if (lambdaInfo.hasLogAlarms) {
        this.createLogBasedAlarms({
          lambdaInfo,
          projectConfig,
          signatureErrorThreshold,
          generalErrorThreshold,
          evaluationPeriod,
        });
      }
    });

    // API Gateway monitoring (always required)
    this.createApiGatewayMonitoring({
      apiGatewayId,
      stageName: apiGatewayStageName,
      threshold5xx: apiGateway5xxThreshold,
      threshold4xx: apiGateway4xxThreshold,
      latencyThreshold: apiGatewayLatencyThreshold,
      evaluationPeriod,
    });

    // Create ElastiCache monitoring if replication group ID is provided
    if (cacheReplicationGroupId) {
      this.createElastiCacheMonitoring({
        replicationGroupId: cacheReplicationGroupId,
        cpuThreshold: cacheCpuThreshold,
        memoryThreshold: cacheMemoryThreshold,
        connectionThreshold: cacheConnectionThreshold,
        evaluationPeriod,
      });
    }

    // Create Dead Letter Queue monitoring if queue name is provided
    if (deadLetterQueueName) {
      this.createDeadLetterQueueMonitoring({
        queueName: deadLetterQueueName,
        threshold: dlqMessageThreshold,
        evaluationPeriod,
      });
    }

    // Create SQS Queue Age monitoring if queue name is provided
    if (transactionEventsQueueName) {
      this.createSQSQueueAgeMonitoring({
        queueName: transactionEventsQueueName,
        threshold: sqsQueueAgeThreshold,
        evaluationPeriod,
      });
    }

    // Add tags
    cdk.Tags.of(this).add("Project", projectConfig.projectDisplayName);
    cdk.Tags.of(this).add("Environment", environment);
    cdk.Tags.of(this).add("Component", "Monitoring");
  }

  /**
   * Create log-based alarms for a Lambda function based on its type
   */
  private createLogBasedAlarms({
    lambdaInfo,
    projectConfig,
    signatureErrorThreshold,
    generalErrorThreshold,
    evaluationPeriod,
  }: {
    lambdaInfo: LambdaFunctionInfo;
    projectConfig: ProjectConfig;
    signatureErrorThreshold: number;
    generalErrorThreshold: number;
    evaluationPeriod: cdk.Duration;
  }) {
    const lambdaName = lambdaInfo.functionName;
    const lambdaId = lambdaInfo.id;
    
    // Create log group reference
    const logGroup = logs.LogGroup.fromLogGroupName(
      this,
      `${lambdaId}LogGroup`,
      `/aws/lambda/${lambdaName}`
    );

    // Create appropriate alarms based on Lambda function type
    switch (lambdaId) {
      case "Api":
        this.createApiLogAlarms({
          lambdaName,
          lambdaId,
          logGroup,
          projectConfig,
          generalErrorThreshold,
          evaluationPeriod,
        });
        break;
      // Add more cases for other Lambda types as needed
    }
  }

  private createApiLogAlarms({
    lambdaName,
    lambdaId,
    logGroup,
    projectConfig,
    generalErrorThreshold,
    evaluationPeriod,
  }: {
    lambdaName: string;
    lambdaId: string;
    logGroup: logs.ILogGroup;
    projectConfig: ProjectConfig;
    generalErrorThreshold: number;
    evaluationPeriod: cdk.Duration;
  }) {
    // API errors
    this.createAlarm({
      lambdaName: lambdaId,
      logGroup,
      filterPattern: "ERROR",
      description: "Alarm when API errors are detected",
      metric: new cloudwatch.Metric({
        namespace: `${projectConfig.projectName}/${lambdaId}`,
        metricName: "api-errors",
        statistic: "Sum",
        period: evaluationPeriod,
      }),
      threshold: generalErrorThreshold,
      evaluationPeriods: 1,
    });
  }

  private createAlarm({
    description,
    metric,
    threshold,
    evaluationPeriods,
    lambdaName,
    logGroup,
    filterPattern,
  }: {
    description: string;
    lambdaName: string;
    logGroup: logs.ILogGroup;
    metric: cloudwatch.Metric;
    threshold: number;
    evaluationPeriods: number;
    filterPattern: string;
  }): cloudwatch.Alarm {
    // Use projectConfig for consistent namespace naming
    const metricNamespace = `${this.projectConfig.projectName}/${lambdaName}`;
    
    const metricFilter = new logs.MetricFilter(
      this,
      `${metric.metricName}MetricFilter`,
      {
        logGroup: logGroup,
        metricNamespace,
        metricName: metric.metricName,
        filterPattern: logs.FilterPattern.literal(filterPattern),
        metricValue: "1",
        defaultValue: 0,
      }
    );

    const alarm = new cloudwatch.Alarm(this, metric.metricName, {
      alarmName: `${metric.metricName}`,
      alarmDescription: description,
      metric: metric,
      threshold: threshold,
      evaluationPeriods: evaluationPeriods,
    });

    alarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    return alarm;
  }

  private createLambdaThrottlingAlarm({
    lambdaName,
    displayName,
    threshold,
    evaluationPeriod,
  }: {
    lambdaName: string;
    displayName: string;
    threshold: number;
    evaluationPeriod: cdk.Duration;
  }) {
    // Create CloudWatch alarm for Lambda throttling
    const throttleAlarm = new cloudwatch.Alarm(
      this,
      `${displayName}ThrottleAlarm`,
      {
        alarmName: `lambda-throttle-${lambdaName}`,
        alarmDescription: `Lambda function ${lambdaName} is being throttled`,
        metric: new cloudwatch.Metric({
          namespace: "AWS/Lambda",
          metricName: "Throttles",
          dimensionsMap: {
            FunctionName: lambdaName,
          },
          statistic: "Sum",
          period: evaluationPeriod,
        }),
        threshold: threshold,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );

    throttleAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alarmTopic)
    );
    this.lambdaThrottleAlarms.push(throttleAlarm);

    // Output the alarm name for reference
    new cdk.CfnOutput(this, `${displayName}ThrottleAlarmName`, {
      value: throttleAlarm.alarmName,
      description: `Throttle alarm name for ${displayName} Lambda`,
    });
  }

  private createLambdaConcurrentExecutionAlarm({
    lambdaName,
    displayName,
    threshold,
    evaluationPeriod,
  }: {
    lambdaName: string;
    displayName: string;
    threshold: number;
    evaluationPeriod: cdk.Duration;
  }) {
    // Create CloudWatch alarm for Lambda concurrent executions
    const concurrentExecutionAlarm = new cloudwatch.Alarm(
      this,
      `${displayName}ConcurrentExecutionAlarm`,
      {
        alarmName: `lambda-concurrent-executions-${lambdaName}`,
        alarmDescription: `Lambda function ${lambdaName} concurrent executions approaching limit (>${threshold})`,
        metric: new cloudwatch.Metric({
          namespace: "AWS/Lambda",
          metricName: "ConcurrentExecutions",
          dimensionsMap: {
            FunctionName: lambdaName,
          },
          statistic: "Maximum",
          period: evaluationPeriod,
        }),
        threshold: threshold,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );

    concurrentExecutionAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alarmTopic)
    );
    this.lambdaConcurrentExecutionAlarms.push(concurrentExecutionAlarm);

    // Output the alarm name for reference
    new cdk.CfnOutput(this, `${displayName}ConcurrentExecutionAlarmName`, {
      value: concurrentExecutionAlarm.alarmName,
      description: `Concurrent execution alarm name for ${displayName} Lambda`,
    });
  }

  private createLambdaErrorRateAlarm({
    lambdaName,
    displayName,
    threshold,
    evaluationPeriod,
  }: {
    lambdaName: string;
    displayName: string;
    threshold: number;
    evaluationPeriod: cdk.Duration;
  }) {
    // Create metrics for error rate calculation
    const errorsMetric = new cloudwatch.Metric({
      namespace: "AWS/Lambda",
      metricName: "Errors",
      dimensionsMap: {
        FunctionName: lambdaName,
      },
      statistic: "Sum",
      period: evaluationPeriod,
    });

    const invocationsMetric = new cloudwatch.Metric({
      namespace: "AWS/Lambda",
      metricName: "Invocations",
      dimensionsMap: {
        FunctionName: lambdaName,
      },
      statistic: "Sum",
      period: evaluationPeriod,
    });

    // Create a math expression to calculate error rate as a percentage
    const errorRateMetric = new cloudwatch.MathExpression({
      expression: "(errors / invocations) * 100",
      usingMetrics: {
        errors: errorsMetric,
        invocations: invocationsMetric,
      },
      period: evaluationPeriod,
    });

    // Create CloudWatch alarm for Lambda error rate
    const errorRateAlarm = new cloudwatch.Alarm(
      this,
      `${displayName}ErrorRateAlarm`,
      {
        alarmName: `lambda-error-rate-${lambdaName}`,
        alarmDescription: `Lambda function ${lambdaName} error rate exceeds ${threshold}%`,
        metric: errorRateMetric,
        threshold: threshold,
        evaluationPeriods: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );

    errorRateAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alarmTopic)
    );
    this.lambdaErrorRateAlarms.push(errorRateAlarm);

    // Output the alarm name for reference
    new cdk.CfnOutput(this, `${displayName}ErrorRateAlarmName`, {
      value: errorRateAlarm.alarmName,
      description: `Error rate alarm name for ${displayName} Lambda`,
    });
  }

  private createApiGatewayMonitoring({
    apiGatewayId,
    stageName,
    threshold5xx,
    threshold4xx,
    latencyThreshold,
    evaluationPeriod,
  }: {
    apiGatewayId: string;
    stageName: string;
    threshold5xx: number;
    threshold4xx: number;
    latencyThreshold: number;
    evaluationPeriod: cdk.Duration;
  }) {
    // Create CloudWatch alarm for API Gateway 5XX errors
    const alarm5xx = new cloudwatch.Alarm(this, "ApiGateway5xxAlarm", {
      alarmName: `api-gateway-5xx-errors-${apiGatewayId}`,
      alarmDescription: `API Gateway ${apiGatewayId} is experiencing 5XX server errors`,
      metric: new cloudwatch.Metric({
        namespace: "AWS/ApiGateway",
        metricName: "5XXError",
        dimensionsMap: {
          ApiName: apiGatewayId,
          Stage: stageName,
        },
        statistic: "Sum",
        period: evaluationPeriod,
      }),
      threshold: threshold5xx,
      evaluationPeriods: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    alarm5xx.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // Create CloudWatch alarm for API Gateway 4XX errors
    const alarm4xx = new cloudwatch.Alarm(this, "ApiGateway4xxAlarm", {
      alarmName: `api-gateway-4xx-errors-${apiGatewayId}`,
      alarmDescription: `API Gateway ${apiGatewayId} is experiencing high 4XX client errors`,
      metric: new cloudwatch.Metric({
        namespace: "AWS/ApiGateway",
        metricName: "4XXError",
        dimensionsMap: {
          ApiName: apiGatewayId,
          Stage: stageName,
        },
        statistic: "Sum",
        period: evaluationPeriod,
      }),
      threshold: threshold4xx,
      evaluationPeriods: 2,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    alarm4xx.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // Create CloudWatch alarm for API Gateway latency
    const latencyAlarm = new cloudwatch.Alarm(this, "ApiGatewayLatencyAlarm", {
      alarmName: `api-gateway-high-latency-${apiGatewayId}`,
      alarmDescription: `API Gateway ${apiGatewayId} is experiencing high latency (>${latencyThreshold}ms)`,
      metric: new cloudwatch.Metric({
        namespace: "AWS/ApiGateway",
        metricName: "Latency",
        dimensionsMap: {
          ApiName: apiGatewayId,
          Stage: stageName,
        },
        statistic: "Average",
        period: evaluationPeriod,
      }),
      threshold: latencyThreshold,
      evaluationPeriods: 2,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    latencyAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alarmTopic)
    );

    // Output the alarm names for reference
    new cdk.CfnOutput(this, "ApiGateway5xxAlarmName", {
      value: alarm5xx.alarmName,
      description: "API Gateway 5XX error alarm name",
    });

    new cdk.CfnOutput(this, "ApiGateway4xxAlarmName", {
      value: alarm4xx.alarmName,
      description: "API Gateway 4XX error alarm name",
    });

    new cdk.CfnOutput(this, "ApiGatewayLatencyAlarmName", {
      value: latencyAlarm.alarmName,
      description: "API Gateway latency alarm name",
    });
  }

  private createElastiCacheMonitoring({
    replicationGroupId,
    cpuThreshold,
    memoryThreshold,
    connectionThreshold,
    evaluationPeriod,
  }: {
    replicationGroupId: string;
    cpuThreshold: number;
    memoryThreshold: number;
    connectionThreshold: number;
    evaluationPeriod: cdk.Duration;
  }) {
    // Create CloudWatch alarm for ElastiCache CPU utilization
    const cpuAlarm = new cloudwatch.Alarm(this, "ElastiCacheCpuAlarm", {
      alarmName: `elasticache-high-cpu-${replicationGroupId}`,
      alarmDescription: `High CPU utilization on ElastiCache cluster ${replicationGroupId} (>${cpuThreshold}%)`,
      metric: new cloudwatch.Metric({
        namespace: "AWS/ElastiCache",
        metricName: "CPUUtilization",
        dimensionsMap: {
          ReplicationGroupId: replicationGroupId,
        },
        statistic: "Average",
        period: evaluationPeriod,
      }),
      threshold: cpuThreshold,
      evaluationPeriods: 2,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    cpuAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // Create CloudWatch alarm for ElastiCache memory utilization
    const memoryAlarm = new cloudwatch.Alarm(this, "ElastiCacheMemoryAlarm", {
      alarmName: `elasticache-high-memory-${replicationGroupId}`,
      alarmDescription: `High memory utilization on ElastiCache cluster ${replicationGroupId} (>${memoryThreshold}%)`,
      metric: new cloudwatch.Metric({
        namespace: "AWS/ElastiCache",
        metricName: "DatabaseMemoryUsagePercentage",
        dimensionsMap: {
          ReplicationGroupId: replicationGroupId,
        },
        statistic: "Average",
        period: evaluationPeriod,
      }),
      threshold: memoryThreshold,
      evaluationPeriods: 2,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    memoryAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alarmTopic)
    );

    // Create CloudWatch alarm for ElastiCache connections
    const connectionAlarm = new cloudwatch.Alarm(
      this,
      "ElastiCacheConnectionAlarm",
      {
        alarmName: `elasticache-high-connections-${replicationGroupId}`,
        alarmDescription: `High connection count on ElastiCache cluster ${replicationGroupId} (>${connectionThreshold})`,
        metric: new cloudwatch.Metric({
          namespace: "AWS/ElastiCache",
          metricName: "CurrConnections",
          dimensionsMap: {
            ReplicationGroupId: replicationGroupId,
          },
          statistic: "Average",
          period: evaluationPeriod,
        }),
        threshold: connectionThreshold,
        evaluationPeriods: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );

    connectionAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alarmTopic)
    );

    // Output the alarm names for reference
    new cdk.CfnOutput(this, "ElastiCacheCpuAlarmName", {
      value: cpuAlarm.alarmName,
      description: "ElastiCache CPU utilization alarm name",
    });

    new cdk.CfnOutput(this, "ElastiCacheMemoryAlarmName", {
      value: memoryAlarm.alarmName,
      description: "ElastiCache memory utilization alarm name",
    });

    new cdk.CfnOutput(this, "ElastiCacheConnectionAlarmName", {
      value: connectionAlarm.alarmName,
      description: "ElastiCache connection count alarm name",
    });

    new cdk.CfnOutput(this, "ElastiCacheMonitoringEnabled", {
      value: "true",
      description: "ElastiCache monitoring is enabled",
    });
  }

  private createDeadLetterQueueMonitoring({
    queueName,
    threshold,
    evaluationPeriod,
  }: {
    queueName: string;
    threshold: number;
    evaluationPeriod: cdk.Duration;
  }) {
    // Create CloudWatch alarm for messages in the Dead Letter Queue
    const dlqAlarm = new cloudwatch.Alarm(this, "DeadLetterQueueAlarm", {
      alarmName: `sqs-dlq-messages-${queueName}`,
      alarmDescription: `Messages detected in Dead Letter Queue ${queueName}. This indicates failed message processing. Investigation required.`,
      metric: new cloudwatch.Metric({
        namespace: "AWS/SQS",
        metricName: "ApproximateNumberOfMessagesVisible",
        dimensionsMap: {
          QueueName: queueName,
        },
        statistic: "Sum",
        period: evaluationPeriod,
      }),
      threshold: threshold,
      evaluationPeriods: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    dlqAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // Output the alarm name for reference
    new cdk.CfnOutput(this, "DeadLetterQueueAlarmName", {
      value: dlqAlarm.alarmName,
      description: "Dead Letter Queue alarm name for transaction events",
    });

    new cdk.CfnOutput(this, "DeadLetterQueueMonitoringEnabled", {
      value: "true",
      description: "Dead Letter Queue monitoring is enabled",
    });
  }

  private createSQSQueueAgeMonitoring({
    queueName,
    threshold,
    evaluationPeriod,
  }: {
    queueName: string;
    threshold: number;
    evaluationPeriod: cdk.Duration;
  }) {
    // Create CloudWatch alarm for Age of Oldest Message in SQS Queue
    const queueAgeAlarm = new cloudwatch.Alarm(this, "SQSQueueAgeAlarm", {
      alarmName: `sqs-queue-age-${queueName}`,
      alarmDescription: `Age of oldest message in queue ${queueName} exceeds ${threshold} seconds. This indicates a processing backlog and may delay transaction processing. Investigation required.`,
      metric: new cloudwatch.Metric({
        namespace: "AWS/SQS",
        metricName: "ApproximateAgeOfOldestMessage",
        dimensionsMap: {
          QueueName: queueName,
        },
        statistic: "Maximum",
        period: evaluationPeriod,
      }),
      threshold: threshold,
      evaluationPeriods: 2,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    queueAgeAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alarmTopic)
    );

    // Output the alarm name for reference
    new cdk.CfnOutput(this, "SQSQueueAgeAlarmName", {
      value: queueAgeAlarm.alarmName,
      description: "SQS Queue Age alarm name for transaction events queue",
    });

    new cdk.CfnOutput(this, "SQSQueueAgeMonitoringEnabled", {
      value: "true",
      description: "SQS Queue Age monitoring is enabled",
    });
  }
}
