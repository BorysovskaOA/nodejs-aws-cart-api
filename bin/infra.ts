import * as cdk from 'aws-cdk-lib/core';
import { CartServiceStack } from '../lib/main';

const app = new cdk.App();
new CartServiceStack(app, 'CartServiceStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
