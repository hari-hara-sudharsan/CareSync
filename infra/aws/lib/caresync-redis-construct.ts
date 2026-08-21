import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { CareSyncVpcConstruct } from './caresync-vpc-construct';

export interface CareSyncRedisConstructProps {
  config: EnvironmentConfig;
  vpcConstruct: CareSyncVpcConstruct;
}

export class CareSyncRedisConstruct extends Construct {
  public readonly subnetGroup: elasticache.CfnSubnetGroup;
  public readonly redisCluster: elasticache.CfnCacheCluster;

  constructor(scope: Construct, id: string, props: CareSyncRedisConstructProps) {
    super(scope, id);

    const { config, vpcConstruct } = props;
    const prefix = `${config.projectName}-${config.environment}`;

    // 1. ElastiCache Subnet Group (Private Isolated Subnets)
    const isolatedSubnetIds = vpcConstruct.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    }).subnetIds;

    this.subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      cacheSubnetGroupName: `${prefix}-redis-subnet-group`,
      description: 'CareSync ElastiCache Redis Subnet Group - Isolated Private Subnets',
      subnetIds: isolatedSubnetIds,
    });

    // 2. Cost-conscious Single-Node ElastiCache Redis Cluster for Transient Event Transport
    this.redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      clusterName: `${prefix}-redis`,
      engine: 'redis',
      cacheNodeType: 'cache.t4g.micro', // Cost-conscious ARM cache instance
      numCacheNodes: 1, // Single node (Non-clustered) for hackathon demo cost control
      cacheSubnetGroupName: this.subnetGroup.cacheSubnetGroupName,
      vpcSecurityGroupIds: [vpcConstruct.redisSecurityGroup.securityGroupId],
      port: 6379,
      autoMinorVersionUpgrade: true,
    });

    this.redisCluster.addDependency(this.subnetGroup);

    // CfnOutputs for Redis Cluster Configuration
    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.redisCluster.attrRedisEndpointAddress,
      description: 'CareSync Private ElastiCache Redis Endpoint Address',
    });

    new cdk.CfnOutput(this, 'RedisPort', {
      value: this.redisCluster.attrRedisEndpointPort,
      description: 'CareSync ElastiCache Redis Port (6379)',
    });
  }
}
