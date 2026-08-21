import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { CareSyncVpcConstruct } from './caresync-vpc-construct';

export interface CareSyncRdsConstructProps {
  config: EnvironmentConfig;
  vpcConstruct: CareSyncVpcConstruct;
}

export class CareSyncRdsConstruct extends Construct {
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly databaseInstance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: CareSyncRdsConstructProps) {
    super(scope, id);

    const { config, vpcConstruct } = props;
    const prefix = `${config.projectName}-${config.environment}`;

    // 1. Database Credentials in AWS Secrets Manager (Auto-generated secure password)
    this.dbSecret = new secretsmanager.Secret(this, 'RdsCredentialsSecret', {
      secretName: `${prefix}/rds-credentials`,
      description: 'CareSync RDS PostgreSQL Database Credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '/@" \'\\',
        passwordLength: 32,
      },
    });

    // 2. Cost-conscious RDS PostgreSQL 16 Instance for Hackathon Demo
    this.databaseInstance = new rds.DatabaseInstance(this, 'DatabaseInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_1,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc: vpcConstruct.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [vpcConstruct.dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      databaseName: 'caresync_db',
      allocatedStorage: 20,
      maxAllocatedStorage: 20, // Prevents automatic storage scaling costs
      storageType: rds.StorageType.GP3,
      publiclyAccessible: false, // Strict isolated private database
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false, // Set to false for hackathon demo tear-down capability
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Stack cleanup policy
    });

    // CfnOutputs for RDS outputs
    new cdk.CfnOutput(this, 'RdsEndpoint', {
      value: this.databaseInstance.dbInstanceEndpointAddress,
      description: 'CareSync Private RDS PostgreSQL Endpoint Address',
    });

    new cdk.CfnOutput(this, 'RdsPort', {
      value: this.databaseInstance.dbInstanceEndpointPort,
      description: 'CareSync RDS PostgreSQL Port (5432)',
    });

    new cdk.CfnOutput(this, 'RdsSecretArn', {
      value: this.dbSecret.secretArn,
      description: 'AWS Secrets Manager Secret ARN for RDS Password',
    });
  }
}
