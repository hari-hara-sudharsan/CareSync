import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { CareSyncVpcConstruct } from './caresync-vpc-construct';
import { CareSyncRdsConstruct } from './caresync-rds-construct';
import { CareSyncRedisConstruct } from './caresync-redis-construct';
export interface CareSyncStackProps extends cdk.StackProps {
    config: EnvironmentConfig;
}
export declare class CareSyncStack extends cdk.Stack {
    readonly vpcConstruct: CareSyncVpcConstruct;
    readonly rdsConstruct: CareSyncRdsConstruct;
    readonly redisConstruct: CareSyncRedisConstruct;
    constructor(scope: Construct, id: string, props: CareSyncStackProps);
}
