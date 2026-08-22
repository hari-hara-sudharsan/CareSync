import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
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

export class CareSyncEcsConstruct extends Construct {
  public readonly cluster: ecs.Cluster;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly listener: elbv2.ApplicationListener;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;
  public readonly fargateService: ecs.FargateService;
  public readonly workerFargateService: ecs.FargateService;
  public readonly appSecret: secretsmanager.ISecret;
  public readonly logGroup: logs.LogGroup;
  public readonly workerLogGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: CareSyncEcsConstructProps) {
    super(scope, id);

    const { config, vpcConstruct, rdsConstruct, redisConstruct } = props;
    const prefix = `${config.projectName}-${config.environment}`;

    // 1. CloudWatch Log Group for ECS API & Worker Task Logs
    this.logGroup = new logs.LogGroup(this, 'EcsLogGroup', {
      logGroupName: `/aws/ecs/${prefix}-api`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.workerLogGroup = new logs.LogGroup(this, 'WorkerLogGroup', {
      logGroupName: `/aws/ecs/${prefix}-worker`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 2. Application Secrets in AWS Secrets Manager (Phase 12F Hardening)
    this.appSecret = new secretsmanager.Secret(this, 'AppSecrets', {
      secretName: `${prefix}/app-secrets`,
      description: 'CareSync Application JWT and API Security Keys',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          jwt_secret_key: 'caresync-jwt-demo-secret-key-change-in-prod',
          admin_api_key: 'caresync-admin-demo-key-change-in-prod',
        }),
        generateStringKey: 'secret_key',
        excludeCharacters: '/@" \'\\',
        passwordLength: 32,
      },
    });

    // 3. ECS Cluster
    this.cluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: `${prefix}-cluster`,
      vpc: vpcConstruct.vpc,
      containerInsights: false, // Disabled for cost optimization
    });

    // 4. IAM Execution Role & Task Role (Least-Privilege Authorization)
    const taskExecutionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      roleName: `${prefix}-ecs-execution-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Grant Secrets Manager read permission for RDS and Application secrets retrieval
    rdsConstruct.dbSecret.grantRead(taskExecutionRole);
    this.appSecret.grantRead(taskExecutionRole);

    const taskRole = new iam.Role(this, 'EcsTaskRole', {
      roleName: `${prefix}-ecs-task-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    const workerTaskRole = new iam.Role(this, 'WorkerTaskRole', {
      roleName: `${prefix}-worker-task-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // 5. Cost-Conscious Fargate Task Definitions (0.25 vCPU / 512 MB RAM)
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'FargateTaskDef', {
      cpu: 256, // 0.25 vCPU
      memoryLimitMiB: 512, // 512 MB RAM
      executionRole: taskExecutionRole,
      taskRole: taskRole,
    });

    const workerTaskDefinition = new ecs.FargateTaskDefinition(this, 'WorkerTaskDef', {
      cpu: 256, // 0.25 vCPU
      memoryLimitMiB: 512, // 512 MB RAM
      executionRole: taskExecutionRole,
      taskRole: workerTaskRole,
    });

    // 6. Container Specification (CareSync FastAPI Backend)
    taskDefinition.addContainer('CareSyncApiContainer', {
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
        JWT_SECRET_KEY: ecs.Secret.fromSecretsManager(this.appSecret, 'jwt_secret_key'),
        SECRET_KEY: ecs.Secret.fromSecretsManager(this.appSecret, 'secret_key'),
        ADMIN_API_KEY: ecs.Secret.fromSecretsManager(this.appSecret, 'admin_api_key'),
      },
    }).addPortMappings({
      containerPort: 8000,
      protocol: ecs.Protocol.TCP,
    });

    // Container Specification (CareSync Outbox Worker)
    workerTaskDefinition.addContainer('CareSyncWorkerContainer', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/nginx/nginx:latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'caresync-worker',
        logGroup: this.workerLogGroup,
      }),
      environment: {
        ENVIRONMENT: config.environment,
        PROJECT_NAME: config.projectName,
        POSTGRES_DB: 'caresync_db',
        POSTGRES_HOST: rdsConstruct.databaseInstance.dbInstanceEndpointAddress,
        POSTGRES_PORT: '5432',
        REDIS_HOST: redisConstruct.redisCluster.attrRedisEndpointAddress,
        REDIS_PORT: '6379',
        WORKER_MODE: 'outbox_processor',
      },
      secrets: {
        POSTGRES_PASSWORD: ecs.Secret.fromSecretsManager(rdsConstruct.dbSecret, 'password'),
        JWT_SECRET_KEY: ecs.Secret.fromSecretsManager(this.appSecret, 'jwt_secret_key'),
        SECRET_KEY: ecs.Secret.fromSecretsManager(this.appSecret, 'secret_key'),
      },
    });

    // 7. Application Load Balancer (Public Subnets)
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      loadBalancerName: `${prefix}-alb`,
      vpc: vpcConstruct.vpc,
      internetFacing: true,
      securityGroup: vpcConstruct.albSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // 8. Target Group & Health Checks
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

    // 9. HTTP Listener (Forward Port 80 to Target Group)
    this.listener = this.alb.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [this.targetGroup],
    });

    // 10. API Fargate Service (PRIVATE_ISOLATED Subnets, AssignPublicIp: DISABLED)
    this.fargateService = new ecs.FargateService(this, 'FargateService', {
      serviceName: `${prefix}-api-service`,
      cluster: this.cluster,
      taskDefinition: taskDefinition,
      desiredCount: 1,
      securityGroups: [vpcConstruct.ecsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Hardened private isolated subnet execution
      },
      assignPublicIp: false, // Strict non-public IP placement
    });

    this.targetGroup.addTarget(this.fargateService);

    // 11. Outbox Worker Fargate Service (PRIVATE_ISOLATED Subnets, AssignPublicIp: DISABLED)
    this.workerFargateService = new ecs.FargateService(this, 'WorkerFargateService', {
      serviceName: `${prefix}-worker-service`,
      cluster: this.cluster,
      taskDefinition: workerTaskDefinition,
      desiredCount: 1,
      securityGroups: [vpcConstruct.ecsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Private isolated subnets for worker
      },
      assignPublicIp: false, // Strictly non-public
    });

    // CfnOutputs for ALB & Secrets Metadata
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

    new cdk.CfnOutput(this, 'EcsApiService', {
      value: this.fargateService.serviceName,
      description: 'CareSync Private API Fargate Service Name',
    });

    new cdk.CfnOutput(this, 'EcsWorkerService', {
      value: this.workerFargateService.serviceName,
      description: 'CareSync Private Outbox Worker Fargate Service Name',
    });

    new cdk.CfnOutput(this, 'AppSecretArn', {
      value: this.appSecret.secretArn,
      description: 'AWS Secrets Manager Secret ARN for Application Security Keys',
    });
  }
}
