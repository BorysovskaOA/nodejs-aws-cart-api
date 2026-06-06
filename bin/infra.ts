import * as cdk from 'aws-cdk-lib/core';
import { CartServiceStack } from '../lib/main';

const app = new cdk.App();
new CartServiceStack(app, 'CartServiceStack');
