import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { CareSyncVpcConstruct } from './caresync-vpc-construct';
export interface CareSyncStackProps extends cdk.StackProps {
    config: EnvironmentConfig;
}
export declare class CareSyncStack extends cdk.Stack {
    readonly vpcConstruct: CareSyncVpcConstruct;
    constructor(scope: Construct, id: string, props: CareSyncStackProps);
}
