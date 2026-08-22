import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { CareSyncVpcConstruct } from './caresync-vpc-construct';
import { CareSyncRdsConstruct } from './caresync-rds-construct';
import { CareSyncRedisConstruct } from './caresync-redis-construct';
export interface CareSyncEcsConstructProps {
    config: EnvironmentConfig;
    vpcConstruct: CareSyncVpcConstruct;
    rdsConstruct: CareSyncRdsConstruct;
    redisConstruct: CareSyncRedisConstruct;
}
export declare class CareSyncEcsConstruct extends Construct {
    readonly cluster: ecs.Cluster;
    readonly alb: elbv2.ApplicationLoadBalancer;
    readonly listener: elbv2.ApplicationListener;
    readonly targetGroup: elbv2.ApplicationTargetGroup;
    readonly fargateService: ecs.FargateService;
    readonly workerFargateService: ecs.FargateService;
    readonly appSecret: secretsmanager.ISecret;
    readonly logGroup: logs.LogGroup;
    readonly workerLogGroup: logs.LogGroup;
    constructor(scope: Construct, id: string, props: CareSyncEcsConstructProps);
}
