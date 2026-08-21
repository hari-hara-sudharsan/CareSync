import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig, applyStandardTags } from '../config/environments';
import { CareSyncVpcConstruct } from './caresync-vpc-construct';

export interface CareSyncStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class CareSyncStack extends cdk.Stack {
  public readonly vpcConstruct: CareSyncVpcConstruct;

  constructor(scope: Construct, id: string, props: CareSyncStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Apply standard hackathon tags across all CDK stack resources
    applyStandardTags(this, config.tags);

    // CfnOutput for stack metadata
    new cdk.CfnOutput(this, 'ProjectName', {
      value: config.projectName,
      description: 'CareSync Project Identifier',
    });

    new cdk.CfnOutput(this, 'DeploymentEnvironment', {
      value: config.environment,
      description: 'Target Deployment Environment (demo)',
    });

    new cdk.CfnOutput(this, 'TargetRegion', {
      value: config.region,
      description: 'Primary AWS Region (ap-south-1)',
    });

    new cdk.CfnOutput(this, 'MonthlyBudgetAlertTargetUSD', {
      value: `$${config.monthlyBudgetUSD}`,
      description: 'Target Cost Alert Ceiling (USD 20)',
    });

    // Instantiate Phase 12B Network & Subnet Construct
    this.vpcConstruct = new CareSyncVpcConstruct(this, 'VpcConstruct', {
      config,
    });
  }
}
