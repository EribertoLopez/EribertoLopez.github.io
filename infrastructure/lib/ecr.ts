import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";

export interface ECRStackProps extends cdk.StackProps {
  environment: string;
}

export class ECRStack extends cdk.Stack {
  public eltServiceRepository: ecr.Repository;
  public loadTestingServiceRepository: ecr.Repository;

  constructor(
    scope: Construct,
    id: string,
    props: ECRStackProps,
    isLocalDeployment: boolean = true
  ) {
    super(scope, id, props);

    this.createELTECRRepository({ environment: props.environment });
    this.createLoadTestingECRRepository({ environment: props.environment });
  }

  private createELTECRRepository({ environment }: { environment: string }) {
    // Create ECR Repository for ELT Service
    this.eltServiceRepository = new ecr.Repository(
      this,
      "ELTServiceECRRepository",
      {
        repositoryName: `fund-a-scholar-data/elt-service-${environment}`,

        // Lifecycle policy to expire untagged images older than 30 days
        lifecycleRules: [
          {
            rulePriority: 1,
            description: "Expire untagged images older than 30 days",
            tagStatus: ecr.TagStatus.UNTAGGED,
            maxImageAge: cdk.Duration.days(30),
          },
        ],

        // Remove repository when stack is deleted (be careful with this in production)
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    // Add repository policy with ECR permissions
    this.eltServiceRepository.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories",
          "ecr:GetRepositoryPolicy",
          "ecr:ListImages",
          "ecr:DeleteRepository",
          "ecr:BatchDeleteImage",
          "ecr:SetRepositoryPolicy",
          "ecr:DeleteRepositoryPolicy",
        ],
      })
    );

    // Output the repository URI
    new cdk.CfnOutput(this, "ELTServiceRepositoryUri", {
      description: "URI of the created ECR repository",
      value: this.eltServiceRepository.repositoryUri,
      exportName: `fund-a-scholar-data-${environment}-ELTServiceECRRepositoryUri`,
    });
  }

  private createLoadTestingECRRepository({
    environment,
  }: {
    environment: string;
  }) {
    // Create ECR Repository for ELT Service
    this.loadTestingServiceRepository = new ecr.Repository(
      this,
      "LoadTestingServiceECRRepository",
      {
        repositoryName: `fund-a-scholar-load-testing/load-testing-service-${environment}`,

        // Lifecycle policy to expire untagged images older than 30 days
        lifecycleRules: [
          {
            rulePriority: 1,
            description: "Expire untagged images older than 30 days",
            tagStatus: ecr.TagStatus.UNTAGGED,
            maxImageAge: cdk.Duration.days(30),
          },
        ],

        // Remove repository when stack is deleted (be careful with this in production)
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    // Add repository policy with ECR permissions
    this.loadTestingServiceRepository.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories",
          "ecr:GetRepositoryPolicy",
          "ecr:ListImages",
          "ecr:DeleteRepository",
          "ecr:BatchDeleteImage",
          "ecr:SetRepositoryPolicy",
          "ecr:DeleteRepositoryPolicy",
        ],
      })
    );

    // Output the repository URI
    new cdk.CfnOutput(this, "LoadTestingServiceRepositoryUri", {
      description: "URI of the created ECR repository",
      value: this.loadTestingServiceRepository.repositoryUri,
      exportName: `fund-a-scholar-load-testing-${environment}-LoadTestingServiceECRRepositoryUri`,
    });
  }
}
