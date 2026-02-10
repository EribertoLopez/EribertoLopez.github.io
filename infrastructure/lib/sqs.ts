import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { NamingConvention } from "../bin/naming";
import { ProjectConfig } from "../bin/project-config";

export interface SQSStackProps extends cdk.StackProps {
  projectConfig: ProjectConfig;
  naming: NamingConvention;
}

export class SQSStack extends cdk.Stack {
  public transactionEventsQueue!: cdk.aws_sqs.Queue;
  public transactionEventsDeadLetterQueue!: cdk.aws_sqs.Queue;
  public envName: string;
  private naming: NamingConvention;
  private projectConfig: ProjectConfig;

  constructor(scope: Construct, id: string, props: SQSStackProps) {
    super(scope, id, props);

    this.envName = props.tags?.Environment || "dev";
    this.naming = props.naming;
    this.projectConfig = props.projectConfig;

    this.createTransactionQueue();
  }
  // TODO: This comes from a previous project (Fund-A-Scholar) and should be refactored to be more generic.
  private createTransactionQueue() {
    // dead letter queue for transaction events
    this.transactionEventsDeadLetterQueue = new cdk.aws_sqs.Queue(
      this,
      "TransactionEventsDeadLetterQueue",
      {
        queueName: `${this.naming.queueName("transaction-events-dead-letter-queue")}.fifo`,
        fifo: true,
        encryption: cdk.aws_sqs.QueueEncryption.KMS,
        retentionPeriod: cdk.Duration.days(14),
      }
    );

    // fifo queue for transaction events
    this.transactionEventsQueue = new cdk.aws_sqs.Queue(
      this,
      "TransactionEventsQueue",
      {
        queueName: `${this.naming.queueName("transaction-events-queue")}.fifo`,
        fifo: true,
        encryption: cdk.aws_sqs.QueueEncryption.KMS,
        retentionPeriod: cdk.Duration.days(14),
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: this.transactionEventsDeadLetterQueue,
        },
      }
    );

    // output the queue urls
    new cdk.CfnOutput(this, "TransactionEventsQueueUrl", {
      value: this.transactionEventsQueue.queueUrl,
    });

    new cdk.CfnOutput(this, "TransactionEventsDeadLetterQueueUrl", {
      value: this.transactionEventsDeadLetterQueue.queueUrl,
    });

    // add tags
    cdk.Tags.of(this).add("Project", this.projectConfig.projectDisplayName);
    cdk.Tags.of(this).add("Environment", this.envName);
  }
}
