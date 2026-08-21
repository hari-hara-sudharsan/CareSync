import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
export interface CareSyncVpcConstructProps {
    config: EnvironmentConfig;
}
export declare class CareSyncVpcConstruct extends Construct {
    readonly vpc: ec2.Vpc;
    readonly albSecurityGroup: ec2.SecurityGroup;
    readonly ecsSecurityGroup: ec2.SecurityGroup;
    readonly dbSecurityGroup: ec2.SecurityGroup;
    readonly redisSecurityGroup: ec2.SecurityGroup;
    constructor(scope: Construct, id: string, props: CareSyncVpcConstructProps);
}
