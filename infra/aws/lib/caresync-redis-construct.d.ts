import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { CareSyncVpcConstruct } from './caresync-vpc-construct';
export interface CareSyncRedisConstructProps {
    config: EnvironmentConfig;
    vpcConstruct: CareSyncVpcConstruct;
}
export declare class CareSyncRedisConstruct extends Construct {
    readonly subnetGroup: elasticache.CfnSubnetGroup;
    readonly redisCluster: elasticache.CfnCacheCluster;
    constructor(scope: Construct, id: string, props: CareSyncRedisConstructProps);
}
