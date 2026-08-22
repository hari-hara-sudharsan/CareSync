import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { CareSyncEcsConstruct } from './caresync-ecs-construct';
export interface CareSyncFrontendConstructProps {
    config: EnvironmentConfig;
    ecsConstruct: CareSyncEcsConstruct;
}
export declare class CareSyncFrontendConstruct extends Construct {
    readonly bucket: s3.Bucket;
    readonly distribution: cloudfront.Distribution;
    constructor(scope: Construct, id: string, props: CareSyncFrontendConstructProps);
}
