import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export class LambdaResources extends Construct {
  public readonly bbfFunction: NodejsFunction;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.bbfFunction = new NodejsFunction(this, 'BackendForFrontend', {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_24_X,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        tsconfig: path.resolve(__dirname, '../tsconfig.json'),
        minify: true,
        sourceMap: true,
        bundleAwsSDK: true,
        externalModules: [
          '@nestjs/microservices',
          '@nestjs/microservices/microservices-module',
          '@nestjs/websockets',
          '@nestjs/websockets/socket-module',
          'class-validator',
          'class-transformer',
        ],
      },
      timeout: cdk.Duration.seconds(10),
      entry: path.join(__dirname, '../src/lambda.ts'),
      handler: 'handler',
      logGroup: new logs.LogGroup(this, 'BackendForFrontendLogs', {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });
  }
}
