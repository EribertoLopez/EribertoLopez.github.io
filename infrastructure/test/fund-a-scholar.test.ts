import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Infrastructure from '../lib/fund-a-scholar-stack';

test('Fund-A-Scholar Stack Created', () => {
  const app = new cdk.App();
  
  // WHEN
  const stack = new Infrastructure.FundAScholarStack(app, 'MyTestStack');
  
  // THEN
  const template = Template.fromStack(stack);

  // Verify S3 bucket is created
  template.hasResourceProperties('AWS::S3::Bucket', {
    WebsiteConfiguration: {
      IndexDocument: 'index.html',
      ErrorDocument: 'error.html'
    }
  });

  // Verify CloudFront distribution is created
  template.hasResourceProperties('AWS::CloudFront::Distribution', {});

  // Verify DynamoDB tables are created
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: 'PAY_PER_REQUEST'
  });

  // Verify Lambda function is created
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'nodejs18.x'
  });

  // Verify API Gateway is created
  template.hasResourceProperties('AWS::ApiGateway::RestApi', {});
}); 