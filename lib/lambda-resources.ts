import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class LambdaResources extends Construct {
  public readonly cardServiceFunction: NodejsFunction;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const defaultVpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
      isDefault: true,
    });

    const dbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'DbSG',
      'sg-06a640a138ab7beb7',
    );

    const dbHost = ssm.StringParameter.valueForStringParameter(
      this,
      '/config/prod/db-host',
    );

    const dbPort = ssm.StringParameter.valueForStringParameter(
      this,
      '/config/prod/db-port',
    );

    const dbUser = ssm.StringParameter.valueForStringParameter(
      this,
      '/config/prod/db-user',
    );

    const dbPassword = ssm.StringParameter.valueForStringParameter(
      this,
      '/config/prod/db-password',
    );

    const productTableName = ssm.StringParameter.valueForStringParameter(
      this,
      '/config/prod/dynamoDbTable/products',
    );

    this.cardServiceFunction = new NodejsFunction(this, 'CardServiceFunction', {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_24_X,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        DB_HOST: dbHost,
        DB_PORT: dbPort,
        DB_USER: dbUser,
        DB_PASSWORD: dbPassword,
        DB_NAME: 'cart_db',
        PRODUCT_TABLE: productTableName,
      },
      vpc: defaultVpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      securityGroups: [dbSecurityGroup],
      bundling: {
        tsconfig: path.resolve(__dirname, '../tsconfig.json'),
        minify: true,
        sourceMap: true,
        bundleAwsSDK: true,
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [`cp -r ${inputDir}/src/database ${outputDir}/`];
          },
          afterBundling(): string[] {
            return [];
          },
          beforeInstall(): string[] {
            return [];
          },
        },
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

    this.cardServiceFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:BatchGetItem', 'dynamodb:GetItem'],
        resources: [
          `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${productTableName}`,
        ],
      }),
    );
  }
}
