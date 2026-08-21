import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

export interface CareSyncVpcConstructProps {
  config: EnvironmentConfig;
}

export class CareSyncVpcConstruct extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly redisSecurityGroup: ec2.SecurityGroup;
  public readonly vpcEndpointsSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: CareSyncVpcConstructProps) {
    super(scope, id);

    const { config } = props;
    const prefix = `${config.projectName}-${config.environment}`;

    // 1. VPC Definition (2 Availability Zones, 0 NAT Gateways for cost control)
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: `${prefix}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 0, // Strict $0/mo NAT Gateway cost policy
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'IsolatedDB',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // 2. S3 Gateway Endpoint (Zero-cost S3 access without NAT Gateway)
    this.vpc.addGatewayEndpoint('S3GatewayEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [
        { subnetType: ec2.SubnetType.PUBLIC },
        { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      ],
    });

    // 3. Security Groups & Isolation Rules

    // ALB Security Group: Inbound HTTP/HTTPS from Internet, Outbound to ECS Tasks
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `${prefix}-alb-sg`,
      description: 'CareSync ALB Security Group - Internet Facing',
      allowAllOutbound: false,
    });
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from Internet'
    );
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from Internet'
    );

    // ECS Security Group: Inbound Port 8000 from ALB, Outbound to DB, Redis, and VPC Endpoints
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `${prefix}-ecs-sg`,
      description: 'CareSync ECS Fargate Tasks Security Group',
      allowAllOutbound: false,
    });
    this.ecsSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(8000),
      'Allow HTTP traffic on port 8000 from ALB'
    );

    // ALB Egress rule to ECS Tasks on Port 8000
    this.albSecurityGroup.addEgressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(8000),
      'Allow ALB egress to ECS Fargate on Port 8000'
    );

    // DB Security Group: Inbound Port 5432 strictly from ECS Tasks
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `${prefix}-db-sg`,
      description: 'CareSync Isolated PostgreSQL Security Group',
      allowAllOutbound: false,
    });
    this.dbSecurityGroup.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL Port 5432 strictly from ECS Tasks'
    );
    this.ecsSecurityGroup.addEgressRule(
      this.dbSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow ECS Task egress to PostgreSQL on Port 5432'
    );

    // Redis Security Group: Inbound Port 6379 strictly from ECS Tasks
    this.redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `${prefix}-redis-sg`,
      description: 'CareSync Isolated Redis Security Group',
      allowAllOutbound: false,
    });
    this.redisSecurityGroup.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Redis Port 6379 strictly from ECS Tasks'
    );
    this.ecsSecurityGroup.addEgressRule(
      this.redisSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow ECS Task egress to Redis on Port 6379'
    );

    // VPC Endpoints Security Group (Inbound HTTPS 443 strictly from ECS Tasks)
    this.vpcEndpointsSecurityGroup = new ec2.SecurityGroup(this, 'VpcEndpointsSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `${prefix}-vpce-sg`,
      description: 'CareSync Private VPC Endpoints Security Group',
      allowAllOutbound: false,
    });
    this.vpcEndpointsSecurityGroup.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(443),
      'Allow HTTPS 443 strictly from ECS Tasks for AWS API Endpoints'
    );
    this.ecsSecurityGroup.addEgressRule(
      this.vpcEndpointsSecurityGroup,
      ec2.Port.tcp(443),
      'Allow ECS Task egress to VPC Interface Endpoints on Port 443'
    );

    // 4. VPC Interface Endpoints (No-NAT Private ECS AWS Service Connectivity)
    // ECR API Interface Endpoint
    this.vpc.addInterfaceEndpoint('EcrApiEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      securityGroups: [this.vpcEndpointsSecurityGroup],
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // ECR Docker Registry Interface Endpoint
    this.vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      securityGroups: [this.vpcEndpointsSecurityGroup],
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // CloudWatch Logs Interface Endpoint
    this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      securityGroups: [this.vpcEndpointsSecurityGroup],
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // Secrets Manager Interface Endpoint
    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      securityGroups: [this.vpcEndpointsSecurityGroup],
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // Stack CfnOutputs for Network Verification
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'CareSync VPC ID',
    });
    new cdk.CfnOutput(this, 'AlbSecurityGroupId', {
      value: this.albSecurityGroup.securityGroupId,
      description: 'CareSync ALB Security Group ID',
    });
    new cdk.CfnOutput(this, 'EcsSecurityGroupId', {
      value: this.ecsSecurityGroup.securityGroupId,
      description: 'CareSync ECS Security Group ID',
    });
    new cdk.CfnOutput(this, 'DbSecurityGroupId', {
      value: this.dbSecurityGroup.securityGroupId,
      description: 'CareSync DB Security Group ID',
    });
    new cdk.CfnOutput(this, 'RedisSecurityGroupId', {
      value: this.redisSecurityGroup.securityGroupId,
      description: 'CareSync Redis Security Group ID',
    });
    new cdk.CfnOutput(this, 'VpcEndpointsSecurityGroupId', {
      value: this.vpcEndpointsSecurityGroup.securityGroupId,
      description: 'CareSync VPC Endpoints Security Group ID',
    });
  }
}
