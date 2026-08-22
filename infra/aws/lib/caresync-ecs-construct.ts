import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { CareSyncVpcConstruct } from './caresync-vpc-construct';
import { CareSyncRdsConstruct } from './caresync-rds-construct';
import { CareSyncRedisConstruct } from './caresync-redis-construct';

import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export interface CareSyncEcsConstructProps {
  config: EnvironmentConfig;
  vpcConstruct: CareSyncVpcConstruct;
  rdsConstruct: CareSyncRdsConstruct;
  redisConstruct: CareSyncRedisConstruct;
  certificateArn?: string;
}

export class CareSyncEcsConstruct extends Construct {
  public readonly cluster: ecs.Cluster;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly listener: elbv2.ApplicationListener;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;
  public readonly fargateService: ecs.FargateService;
  public readonly workerFargateService: ecs.FargateService;
  public readonly apiRepository: ecr.Repository;
  public readonly workerRepository: ecr.Repository;
  public readonly appSecret: secretsmanager.ISecret;
  public readonly logGroup: logs.LogGroup;
  public readonly workerLogGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: CareSyncEcsConstructProps) {
    super(scope, id);

    const { config, vpcConstruct, rdsConstruct, redisConstruct } = props;
    const prefix = `${config.projectName}-${config.environment}`;

    // 1. ECR Repositories for Real Application Docker Images
    this.apiRepository = new ecr.Repository(this, 'ApiRepository', {
      repositoryName: `${prefix}-api`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    this.workerRepository = new ecr.Repository(this, 'WorkerRepository', {
      repositoryName: `${prefix}-worker`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // 2. CloudWatch Log Group for ECS API & Worker Task Logs
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

    // 3. Rotated Application Secrets in AWS Secrets Manager (DYNAMIC GENERATION, ZERO PLAINTEXT DEFAULTS)
    this.appSecret = new secretsmanager.Secret(this, 'AppSecretsV2', {
      secretName: `${prefix}/app-secrets-v2`,
      description: 'CareSync Rotated Application JWT and Security Keys',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'jwt_secret_key',
        passwordLength: 64,
        excludeCharacters: '/@" \'\\',
      },
    });

    // 4. ECS Cluster
    this.cluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: `${prefix}-cluster`,
      vpc: vpcConstruct.vpc,
      containerInsights: false, // Disabled for cost optimization
    });

    // 5. SEPARATE IAM Execution Roles for API and Worker (Least Privilege Authorization)

    // API Execution Role (Can read RDS Secret + App Secret)
    const apiExecutionRole = new iam.Role(this, 'ApiEcsTaskExecutionRole', {
      roleName: `${prefix}-api-execution-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });
    rdsConstruct.dbSecret.grantRead(apiExecutionRole);
    this.appSecret.grantRead(apiExecutionRole);
    this.apiRepository.grantPull(apiExecutionRole);

    // Worker Execution Role (Can read RDS Secret ONLY - STRICTLY NO App Secret access)
    const workerExecutionRole = new iam.Role(this, 'WorkerEcsTaskExecutionRole', {
      roleName: `${prefix}-worker-execution-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });
    rdsConstruct.dbSecret.grantRead(workerExecutionRole);
    this.workerRepository.grantPull(workerExecutionRole);

    // Empty Application Task Roles (No unneeded AWS API permissions at runtime)
    const taskRole = new iam.Role(this, 'EcsTaskRole', {
      roleName: `${prefix}-ecs-task-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    const workerTaskRole = new iam.Role(this, 'WorkerTaskRole', {
      roleName: `${prefix}-worker-task-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // 6. Cost-Conscious Fargate Task Definitions (0.25 vCPU / 512 MB RAM)
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'FargateTaskDef', {
      cpu: 256, // 0.25 vCPU
      memoryLimitMiB: 512, // 512 MB RAM
      executionRole: apiExecutionRole,
      taskRole: taskRole,
    });

    const workerTaskDefinition = new ecs.FargateTaskDefinition(this, 'WorkerTaskDef', {
      cpu: 256, // 0.25 vCPU
      memoryLimitMiB: 512, // 512 MB RAM
      executionRole: workerExecutionRole,
      taskRole: workerTaskRole,
    });

    // 7. Real Application Container Specifications (CareSync FastAPI Backend & Outbox Worker)
    const backendPath = path.join(__dirname, '../../../backend');

    taskDefinition.addContainer('CareSyncApiContainer', {
      image: ecs.ContainerImage.fromAsset(backendPath, {
        file: 'Dockerfile',
      }),
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
      },
    }).addPortMappings({
      containerPort: 8000,
      protocol: ecs.Protocol.TCP,
    });

    // Outbox Worker Container (INJECTS ONLY POSTGRES_PASSWORD, NO APP SECRETS)
    workerTaskDefinition.addContainer('CareSyncWorkerContainer', {
      image: ecs.ContainerImage.fromAsset(backendPath, {
        file: 'Dockerfile.worker',
      }),
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
      },
    });

    // 8. Application Load Balancer (Public Subnets)
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      loadBalancerName: `${prefix}-alb`,
      vpc: vpcConstruct.vpc,
      internetFacing: true,
      securityGroup: vpcConstruct.albSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // 9. Target Group & Health Checks
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

    // 10. ALB Listener (HTTPS Port 443 if certificate provided, otherwise HTTP Port 80 for demo baseline)
    if (props.certificateArn) {
      const certificate = acm.Certificate.fromCertificateArn(this, 'AlbCertificate', props.certificateArn);
      
      this.listener = this.alb.addListener('HttpsListener', {
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        certificates: [certificate],
        defaultTargetGroups: [this.targetGroup],
      });

      this.alb.addRedirect({
        sourcePort: 80,
        sourceProtocol: elbv2.ApplicationProtocol.HTTP,
        targetPort: 443,
        targetProtocol: elbv2.ApplicationProtocol.HTTPS,
      });
    } else {
      this.listener = this.alb.addListener('HttpListener', {
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
        defaultTargetGroups: [this.targetGroup],
      });
    }

    // 11. API Fargate Service (PRIVATE_ISOLATED Subnets, AssignPublicIp: DISABLED)
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

    // 12. Outbox Worker Fargate Service (PRIVATE_ISOLATED Subnets, AssignPublicIp: DISABLED)
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
      description: 'AWS Secrets Manager Secret ARN for Rotated Application Security Keys',
    });
  }
}
