#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CareSyncStack } from '../lib/caresync-stack';
import { getEnvironmentConfig } from '../config/environments';

const app = new cdk.App();
const config = getEnvironmentConfig();

const stackName = `${config.projectName}-${config.environment}-stack`;

new CareSyncStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: config.region,
  },
  description: 'CareSync AWS Deployment Stack (Phase 12A IaC Skeleton)',
  config,
});

app.synth();
