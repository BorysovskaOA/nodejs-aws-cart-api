import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';

interface ApiGatewayResourcesProps {
  cardServiceFunction: lambda.IFunction;
}

export class ApiGatewayResources extends Construct {
  public readonly httpApi: apigw.HttpApi;

  constructor(scope: Construct, id: string, props: ApiGatewayResourcesProps) {
    super(scope, id);

    this.httpApi = new apigw.HttpApi(this, 'BffApi', {
      apiName: 'Bff Service',
      createDefaultStage: false,
      corsPreflight: {
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowHeaders: ['*'],
        allowOrigins: [
          'http://localhost:3000',
          'https://d180fy39z34bng.cloudfront.net',
        ],
      },
    });

    new apigw.HttpStage(this, 'DefaultStage', {
      httpApi: this.httpApi,
      stageName: '$default',
      autoDeploy: true,
      throttle: { rateLimit: 10, burstLimit: 20 },
    });

    this.httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigw.HttpMethod.ANY],
      integration: new HttpLambdaIntegration(
        'BffIntegration',
        props.cardServiceFunction,
      ),
    });
  }
}
