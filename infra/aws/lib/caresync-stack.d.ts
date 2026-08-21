import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { CareSyncVpcConstruct } from './caresync-vpc-construct';
import { CareSyncRdsConstruct } from './caresync-rds-construct';
import { CareSyncRedisConstruct } from './caresync-redis-construct';
import { CareSyncEcsConstruct } from './caresync-ecs-construct';
export interface CareSyncStackProps extends cdk.StackProps {
    config: EnvironmentConfig;
}
export declare class CareSyncStack extends cdk.Stack {
    readonly vpcConstruct: CareSyncVpcConstruct;
    readonly rdsConstruct: CareSyncRdsConstruct;
    readonly redisConstruct: CareSyncRedisConstruct;
    readonly ecsConstruct: CareSyncEcsConstruct;
    constructor(scope: Construct, id: string, props: CareSyncStackProps);
}
