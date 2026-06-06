import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { LambdaResources } from './lambda-resources';
import { ApiGatewayResources } from './api-gateway-resources';

export class CartServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaLayer = new LambdaResources(this, 'LambdaLayer');

    const apiGatewayLayer = new ApiGatewayResources(this, 'ApiGatewayLayer', {
      bffFunction: lambdaLayer.bbfFunction,
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value:
        apiGatewayLayer.httpApi.apiEndpoint ??
        'Something went wrong with the endpoint',
      description: 'The URL of the Cart Service API',
    });
  }
}
