// infrastructure/bin/naming.ts

import { ProjectConfig } from "./project-config";

/**
 * Naming convention utility for consistent resource naming across all stacks
 */
export class NamingConvention {
  constructor(
    private config: ProjectConfig,
    private environment: string
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // STACK NAMING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate CDK stack ID
   * Example: "EribertoLopez-VPC-Stack"
   */
  stackId(stackType: string): string {
    return `${this.config.projectName}-${stackType}-Stack`;
  }

  // ═══════════════════════════════════════════════════════════════
  // LAMBDA NAMING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate Lambda function name
   * Example: "EribertoLopez-dev-Api"
   */
  lambdaName(functionName: string): string {
    return `${this.config.projectName}-${this.environment}-${functionName}`;
  }

  /**
   * Generate Lambda function name prefix
   * Example: "EribertoLopez-dev"
   */
  lambdaPrefix(): string {
    return `${this.config.projectName}-${this.environment}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // S3 BUCKET NAMING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate S3 bucket name (must be globally unique, lowercase)
   * Example: "eribertolopez-dev-data-pipeline"
   */
  bucketName(purpose: string): string {
    return `${this.config.projectSlug}-${this.environment}-${purpose}`.toLowerCase();
  }

  // ═══════════════════════════════════════════════════════════════
  // SSM PARAMETER NAMING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate SSM parameter path
   * Example: "/eribertolopez/dev/api-url"
   */
  ssmPath(paramName: string): string {
    return `/${this.config.projectSlug}/${this.environment}/${paramName}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // RESOURCE TAGGING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate standard resource tags
   */
  tags(): Record<string, string> {
    return {
      Project: this.config.projectDisplayName,
      Environment: this.environment,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // DESCRIPTIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate stack description
   * Example: "Eriberto-Lopez-Portfolio VPC stack with public and private subnets"
   */
  stackDescription(description: string): string {
    return `${this.config.projectDisplayName} ${description}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // ECS/CONTAINER NAMING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate ECS cluster name
   * Example: "eribertolopez-dev-cluster"
   */
  clusterName(): string {
    return `${this.config.projectSlug}-${this.environment}-cluster`;
  }

  /**
   * Generate ECS service name
   * Example: "eribertolopez-dev-data-pipeline-service"
   */
  serviceName(purpose: string): string {
    return `${this.config.projectSlug}-${this.environment}-${purpose}-service`;
  }

  /**
   * Generate ECR repository name
   * Example: "eribertolopez/data-pipeline"
   */
  ecrRepoName(imageName: string): string {
    return `${this.config.projectSlug}/${imageName}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // SQS QUEUE NAMING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate SQS queue name
   * Example: "eribertolopez-dev-transaction-events"
   */
  queueName(purpose: string): string {
    return `${this.config.projectSlug}-${this.environment}-${purpose}`;
  }

  /**
   * Generate SQS dead letter queue name
   * Example: "eribertolopez-dev-transaction-events-dlq"
   */
  dlqName(purpose: string): string {
    return `${this.config.projectSlug}-${this.environment}-${purpose}-dlq`;
  }

  // ═══════════════════════════════════════════════════════════════
  // CACHE NAMING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate ElastiCache cluster name
   * Example: "eribertolopez-dev-redis"
   */
  cacheName(): string {
    return `${this.config.projectSlug}-${this.environment}-redis`;
  }

  // ═══════════════════════════════════════════════════════════════
  // SNS TOPIC NAMING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate SNS topic name
   * Example: "eribertolopez-dev-alarms"
   */
  snsTopicName(purpose: string): string {
    return `${this.config.projectSlug}-${this.environment}-${purpose}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // LOG GROUP NAMING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate CloudWatch Log Group name for Lambda
   * Example: "/aws/lambda/EribertoLopez-dev-Api"
   */
  lambdaLogGroupName(functionName: string): string {
    return `/aws/lambda/${this.lambdaName(functionName)}`;
  }

  /**
   * Generate CloudWatch Log Group name for ECS
   * Example: "/eribertolopez-dev-elt-log-group"
   */
  ecsLogGroupName(serviceName: string): string {
    return `/${this.config.projectSlug}-${this.environment}-${serviceName}-log-group`;
  }

  // ═══════════════════════════════════════════════════════════════
  // CLOUDFRONT NAMING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate CloudFront export name
   * Example: "eribertolopez-dev-images-distribution-id"
   */
  cloudfrontExportName(purpose: string): string {
    return `${this.config.projectSlug}-${this.environment}-${purpose}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // ECR EXPORT NAMING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Generate ECR repository export name
   * Example: "eribertolopez-data-dev-ELTServiceECRRepositoryUri"
   */
  ecrExportName(serviceName: string): string {
    return `${this.config.projectSlug}-data-${this.environment}-${serviceName}ECRRepositoryUri`;
  }
}
