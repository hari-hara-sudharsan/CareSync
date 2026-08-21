import { Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface EnvironmentConfig {
  projectName: string;
  environment: 'demo' | 'dev' | 'staging' | 'prod';
  region: string;
  monthlyBudgetUSD: number;
  tags: Record<string, string>;
}

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const region = process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'ap-south-1';
  const environment = (process.env.ENVIRONMENT || 'demo') as EnvironmentConfig['environment'];

  return {
    projectName: 'caresync',
    environment,
    region,
    monthlyBudgetUSD: 20,
    tags: {
      Project: 'CareSync',
      Environment: environment,
      Owner: 'CareSync',
      ManagedBy: 'IaC',
      Purpose: 'Hackathon',
      CostCenter: 'CareSyncDemo',
    },
  };
};

export const applyStandardTags = (scope: Construct, tags: Record<string, string>): void => {
  Object.entries(tags).forEach(([key, value]) => {
    Tags.of(scope).add(key, value);
  });
};
