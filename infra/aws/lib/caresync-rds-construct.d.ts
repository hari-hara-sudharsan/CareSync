import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { CareSyncVpcConstruct } from './caresync-vpc-construct';
export interface CareSyncRdsConstructProps {
    config: EnvironmentConfig;
    vpcConstruct: CareSyncVpcConstruct;
}
export declare class CareSyncRdsConstruct extends Construct {
    readonly dbSecret: secretsmanager.ISecret;
    readonly databaseInstance: rds.DatabaseInstance;
    constructor(scope: Construct, id: string, props: CareSyncRdsConstructProps);
}
