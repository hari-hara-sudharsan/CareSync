import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
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

export class CareSyncEcsConstruct extends Construct {
  public readonly cluster: ecs.Cluster;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly listener: elbv2.ApplicationListener;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;
  public readonly fargateService: ecs.FargateService;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: CareSyncEcsConstructProps) {
    super(scope, id);

    const { config, vpcConstruct, rdsConstruct, redisConstruct } = props;
    const prefix = `${config.projectName}-${config.environment}`;

    // 1. CloudWatch Log Group for ECS Task Logs
    this.logGroup = new logs.LogGroup(this, 'EcsLogGroup', {
      logGroupName: `/aws/ecs/${prefix}-api`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 2. ECS Cluster
    this.cluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: `${prefix}-cluster`,
      vpc: vpcConstruct.vpc,
      containerInsights: false, // Disabled for cost optimization
    });

    // 3. IAM Execution Role & Task Role
    const taskExecutionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      roleName: `${prefix}-ecs-execution-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Grant Secrets Manager read permission for RDS password retrieval
    rdsConstruct.dbSecret.grantRead(taskExecutionRole);

    const taskRole = new iam.Role(this, 'EcsTaskRole', {
      roleName: `${prefix}-ecs-task-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // 4. Cost-Conscious Fargate Task Definition (0.25 vCPU / 512 MB RAM)
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'FargateTaskDef', {
      cpu: 256, // 0.25 vCPU
      memoryLimitMiB: 512, // 512 MB RAM
      executionRole: taskExecutionRole,
      taskRole: taskRole,
    });

    // 5. Container Specification (CareSync FastAPI Backend & Worker)
    const container = taskDefinition.addContainer('CareSyncApiContainer', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/nginx/nginx:latest'), // Placeholder demonstration container image
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'caresync-api',
        logGroup: this.logGroup,
      }),
      environment: {
        ENVIRONMENT: config.environment,
        PROJECT_NAME: config.projectName,
        POSTGRES_DB: 'caresync_db',
        POSTGRES_HOST: rdsConstruct.databaseInstance.dbInstanceEndpointAddress,
        POSTGRES_PORT: '5432',
        REDIS_HOST: redisConstruct.redisCluster.attrRedisEndpointAddress,
        REDIS_PORT: '6379',
      },
      secrets: {
        POSTGRES_PASSWORD: ecs.Secret.fromSecretsManager(rdsConstruct.dbSecret, 'password'),
      },
    });

    container.addPortMappings({
      containerPort: 8000,
      protocol: ecs.Protocol.TCP,
    });

    // 6. Application Load Balancer (Public Subnets)
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      loadBalancerName: `${prefix}-alb`,
      vpc: vpcConstruct.vpc,
      internetFacing: true,
      securityGroup: vpcConstruct.albSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // 7. Target Group & Health Checks
    this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'AlbTargetGroup', {
      targetGroupName: `${prefix}-tg`,
      vpc: vpcConstruct.vpc,
      port: 8000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/api/v1/health',
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        timeout: cdk.Duration.seconds(5),
      },
    });

    // 8. HTTP Listener (Forward Port 80 to Target Group)
    this.listener = this.alb.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [this.targetGroup],
    });

    // 9. Fargate Service (Tasks run with security group isolation)
    this.fargateService = new ecs.FargateService(this, 'FargateService', {
      serviceName: `${prefix}-api-service`,
      cluster: this.cluster,
      taskDefinition: taskDefinition,
      desiredCount: 1, // Single instance cost-conscious deployment
      securityGroups: [vpcConstruct.ecsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // Public subnet task execution ensures zero-NAT API connectivity
      },
      assignPublicIp: true,
    });

    this.targetGroup.addTarget(this.fargateService);

    // CfnOutputs for ALB Metadata
    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: this.alb.loadBalancerDnsName,
      description: 'CareSync Application Load Balancer Public DNS Name',
    });

    new cdk.CfnOutput(this, 'AlbUrl', {
      value: `http://${this.alb.loadBalancerDnsName}`,
      description: 'CareSync Application Public HTTP Base URL',
    });

    new cdk.CfnOutput(this, 'EcsClusterName', {
      value: this.cluster.clusterName,
      description: 'CareSync ECS Cluster Name',
    });

    new cdk.CfnOutput(this, 'EcsServiceName', {
      value: this.fargateService.serviceName,
      description: 'CareSync Fargate Service Name',
    });
  }
}
