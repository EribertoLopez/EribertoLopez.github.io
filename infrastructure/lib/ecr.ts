import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import { NamingConvention } from "../bin/naming";
import { ProjectConfig } from "../bin/project-config";

export interface ECRStackProps extends cdk.StackProps {
  environment: string;
  projectConfig: ProjectConfig;
  naming: NamingConvention;
}

export class ECRStack extends cdk.Stack {
  public eltServiceRepository: ecr.Repository;
  public loadTestingServiceRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props: ECRStackProps) {
    super(scope, id, props);

    const { environment, projectConfig, naming } = props;
    this.createELTECRRepository({ environment, naming });
    this.createLoadTestingECRRepository({ environment, naming });

    cdk.Tags.of(this).add("Project", projectConfig.projectDisplayName);
    cdk.Tags.of(this).add("Environment", environment);
  }

  private createELTECRRepository({ environment, naming }: { environment: string; naming: NamingConvention }) {
    this.eltServiceRepository = new ecr.Repository(this, "ELTServiceECRRepository", {
      repositoryName: naming.ecrRepoName(`elt-service-${environment}`),
      lifecycleRules: [{
        rulePriority: 1,
        description: "Expire untagged images older than 30 days",
        tagStatus: ecr.TagStatus.UNTAGGED,
        maxImageAge: cdk.Duration.days(30),
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.eltServiceRepository.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(cdk.Stack.of(this).account)],
        actions: [
          "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage", "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories", "ecr:GetRepositoryPolicy", "ecr:ListImages",
          "ecr:DeleteRepository", "ecr:BatchDeleteImage", "ecr:SetRepositoryPolicy", "ecr:DeleteRepositoryPolicy",
        ],
      })
    );

    new cdk.CfnOutput(this, "ELTServiceRepositoryUri", {
      description: "URI of the ELT ECR repository",
      value: this.eltServiceRepository.repositoryUri,
      exportName: naming.ecrExportName("ELTService"),
    });
  }

  private createLoadTestingECRRepository({ environment, naming }: { environment: string; naming: NamingConvention }) {
    this.loadTestingServiceRepository = new ecr.Repository(this, "LoadTestingServiceECRRepository", {
      repositoryName: naming.ecrRepoName(`load-testing-service-${environment}`),
      lifecycleRules: [{
        rulePriority: 1,
        description: "Expire untagged images older than 30 days",
        tagStatus: ecr.TagStatus.UNTAGGED,
        maxImageAge: cdk.Duration.days(30),
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.loadTestingServiceRepository.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(cdk.Stack.of(this).account)],
        actions: [
          "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage", "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories", "ecr:GetRepositoryPolicy", "ecr:ListImages",
          "ecr:DeleteRepository", "ecr:BatchDeleteImage", "ecr:SetRepositoryPolicy", "ecr:DeleteRepositoryPolicy",
        ],
      })
    );

    new cdk.CfnOutput(this, "LoadTestingServiceRepositoryUri", {
      description: "URI of the load testing ECR repository",
      value: this.loadTestingServiceRepository.repositoryUri,
      exportName: naming.ecrExportName("LoadTestingService"),
    });
  }
}
