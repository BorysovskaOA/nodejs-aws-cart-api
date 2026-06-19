import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as triggers from 'aws-cdk-lib/triggers';
import { Construct } from 'constructs';
import * as path from 'path';

export class LambdaResources extends Construct {
  public readonly cardServiceFunction: lambda.Function;

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

    const migrationLambda = new NodejsFunction(this, 'MigrationFunction', {
      entry: path.join(__dirname, '../scripts/migration-lambda.ts'),
      handler: 'migrationHandler',
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_24_X,
      vpc: defaultVpc,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        DB_HOST: dbHost,
        DB_PORT: dbPort,
        DB_USER: dbUser,
        DB_PASSWORD: dbPassword,
        DB_NAME: 'cart_db',
        PGSSLMODE: 'no-verify',
        NODE_ENV: 'production',
      },
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      timeout: cdk.Duration.minutes(3),
      bundling: {
        nodeModules: [
          'typeorm',
          'pg',
          'typeorm-extension',
          'ts-node',
          'typescript',
        ],
        commandHooks: {
          beforeBundling() {
            return [];
          },
          beforeInstall() {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string) {
            return [
              `mkdir -p ${outputDir}/src/database/migrations`,
              `npx esbuild ${inputDir}/src/database/migrations/*.ts --platform=node --target=node24 --format=cjs --outdir=${outputDir}/src/database/migrations`,
            ];
          },
        },
        loader: {
          '.ts': 'ts',
        },
      },
      logGroup: new logs.LogGroup(this, 'CardServiceMigrationLogs', {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    dbSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(
        migrationLambda.connections.securityGroups[0].securityGroupId,
      ),
      ec2.Port.tcp(5432),
      'Allow TypeORM migration Lambda to execute database updates',
    );

    // CloudFormation deployment phase execution hook trigger
    new triggers.Trigger(this, 'ExecuteMigrationTrigger', {
      handler: migrationLambda,
      executeOnHandlerChange: true,
    });

    this.cardServiceFunction = new lambda.Function(
      this,
      'CardServiceFunction',
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_24_X,
        environment: {
          NODE_OPTIONS: '--enable-source-maps',
          DB_HOST: dbHost,
          DB_PORT: dbPort,
          DB_USER: dbUser,
          DB_PASSWORD: dbPassword,
          DB_NAME: 'cart_db',
          PGSSLMODE: 'no-verify',
          NODE_ENV: 'production',
        },
        vpc: defaultVpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        allowPublicSubnet: true,
        memorySize: 512,
        timeout: cdk.Duration.seconds(10),
        code: lambda.Code.fromAsset(path.join(__dirname, '../dist')),
        handler: 'lambda.handler',
        logGroup: new logs.LogGroup(this, 'CardServiceLogs', {
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      },
    );

    dbSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(
        this.cardServiceFunction.connections.securityGroups[0].securityGroupId,
      ),
      ec2.Port.tcp(5432),
      'Allow NestJS CardServiceFunction to access the PostgreSQL instance',
    );
  }
}
