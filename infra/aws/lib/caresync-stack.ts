import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig, applyStandardTags } from '../config/environments';
import { CareSyncVpcConstruct } from './caresync-vpc-construct';
import { CareSyncRdsConstruct } from './caresync-rds-construct';
import { CareSyncRedisConstruct } from './caresync-redis-construct';
import { CareSyncEcsConstruct } from './caresync-ecs-construct';
import { CareSyncFrontendConstruct } from './caresync-frontend-construct';

export interface CareSyncStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class CareSyncStack extends cdk.Stack {
  public readonly vpcConstruct: CareSyncVpcConstruct;
  public readonly rdsConstruct: CareSyncRdsConstruct;
  public readonly redisConstruct: CareSyncRedisConstruct;
  public readonly ecsConstruct: CareSyncEcsConstruct;
  public readonly frontendConstruct: CareSyncFrontendConstruct;

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

    // Instantiate Phase 12C RDS PostgreSQL Construct
    this.rdsConstruct = new CareSyncRdsConstruct(this, 'RdsConstruct', {
      config,
      vpcConstruct: this.vpcConstruct,
    });

    // Instantiate Phase 12D ElastiCache Redis Construct
    this.redisConstruct = new CareSyncRedisConstruct(this, 'RedisConstruct', {
      config,
      vpcConstruct: this.vpcConstruct,
    });

    // Instantiate Phase 12E/12F ECS Fargate & ALB Construct
    this.ecsConstruct = new CareSyncEcsConstruct(this, 'EcsConstruct', {
      config,
      vpcConstruct: this.vpcConstruct,
      rdsConstruct: this.rdsConstruct,
      redisConstruct: this.redisConstruct,
    });

    // Instantiate Phase 12G Frontend S3 + CloudFront CDN Construct
    this.frontendConstruct = new CareSyncFrontendConstruct(this, 'FrontendConstruct', {
      config,
      ecsConstruct: this.ecsConstruct,
    });
  }
}
