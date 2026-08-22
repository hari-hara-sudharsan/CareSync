"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareSyncEcsConstruct = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecr = require("aws-cdk-lib/aws-ecr");
const ecs = require("aws-cdk-lib/aws-ecs");
const elbv2 = require("aws-cdk-lib/aws-elasticloadbalancingv2");
const iam = require("aws-cdk-lib/aws-iam");
const logs = require("aws-cdk-lib/aws-logs");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const path = require("path");
const constructs_1 = require("constructs");
class CareSyncEcsConstruct extends constructs_1.Construct {
    cluster;
    alb;
    listener;
    targetGroup;
    fargateService;
    workerFargateService;
    apiRepository;
    workerRepository;
    appSecret;
    logGroup;
    workerLogGroup;
    constructor(scope, id, props) {
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
        // 10. HTTP Listener (Forward Port 80 to Target Group)
        this.listener = this.alb.addListener('HttpListener', {
            port: 80,
            protocol: elbv2.ApplicationProtocol.HTTP,
            defaultTargetGroups: [this.targetGroup],
        });
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
exports.CareSyncEcsConstruct = CareSyncEcsConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZXN5bmMtZWNzLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhcmVzeW5jLWVjcy1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDJDQUEyQztBQUMzQywyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLGdFQUFnRTtBQUNoRSwyQ0FBMkM7QUFDM0MsNkNBQTZDO0FBQzdDLGlFQUFpRTtBQUNqRSw2QkFBNkI7QUFDN0IsMkNBQXVDO0FBYXZDLE1BQWEsb0JBQXFCLFNBQVEsc0JBQVM7SUFDakMsT0FBTyxDQUFjO0lBQ3JCLEdBQUcsQ0FBZ0M7SUFDbkMsUUFBUSxDQUE0QjtJQUNwQyxXQUFXLENBQStCO0lBQzFDLGNBQWMsQ0FBcUI7SUFDbkMsb0JBQW9CLENBQXFCO0lBQ3pDLGFBQWEsQ0FBaUI7SUFDOUIsZ0JBQWdCLENBQWlCO0lBQ2pDLFNBQVMsQ0FBeUI7SUFDbEMsUUFBUSxDQUFnQjtJQUN4QixjQUFjLENBQWdCO0lBRTlDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0M7UUFDeEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQ3JFLE1BQU0sTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFdBQVcsSUFBSSxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFN0QseURBQXlEO1FBQ3pELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDN0QsY0FBYyxFQUFFLEdBQUcsTUFBTSxNQUFNO1lBQy9CLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsYUFBYSxFQUFFLElBQUk7U0FDcEIsQ0FBQyxDQUFDO1FBRUgsSUFB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QWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXO1lBQ3RDLFdBQVcsRUFBRSwyQ0FBMkM7U0FDekQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7WUFDNUMsV0FBVyxFQUFFLHFEQUFxRDtTQUNuRSxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTO1lBQy9CLFdBQVcsRUFBRSxzRUFBc0U7U0FDcEYsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBclFELG9EQXFRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBlY3IgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcic7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBlbGJ2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2xvYWRiYWxhbmNpbmd2Mic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBFbnZpcm9ubWVudENvbmZpZyB9IGZyb20gJy4uL2NvbmZpZy9lbnZpcm9ubWVudHMnO1xuaW1wb3J0IHsgQ2FyZVN5bmNWcGNDb25zdHJ1Y3QgfSBmcm9tICcuL2NhcmVzeW5jLXZwYy1jb25zdHJ1Y3QnO1xuaW1wb3J0IHsgQ2FyZVN5bmNSZHNDb25zdHJ1Y3QgfSBmcm9tICcuL2NhcmVzeW5jLXJkcy1jb25zdHJ1Y3QnO1xuaW1wb3J0IHsgQ2FyZVN5bmNSZWRpc0NvbnN0cnVjdCB9IGZyb20gJy4vY2FyZXN5bmMtcmVkaXMtY29uc3RydWN0JztcblxuZXhwb3J0IGludGVyZmFjZSBDYXJlU3luY0Vjc0NvbnN0cnVjdFByb3BzIHtcbiAgY29uZmlnOiBFbnZpcm9ubWVudENvbmZpZztcbiAgdnBjQ29uc3RydWN0OiBDYXJlU3luY1ZwY0NvbnN0cnVjdDtcbiAgcmRzQ29uc3RydWN0OiBDYXJlU3luY1Jkc0NvbnN0cnVjdDtcbiAgcmVkaXNDb25zdHJ1Y3Q6IENhcmVTeW5jUmVkaXNDb25zdHJ1Y3Q7XG59XG5cbmV4cG9ydCBjbGFzcyBDYXJlU3luY0Vjc0NvbnN0cnVjdCBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBjbHVzdGVyOiBlY3MuQ2x1c3RlcjtcbiAgcHVibGljIHJlYWRvbmx5IGFsYjogZWxidjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXI7XG4gIHB1YmxpYyByZWFkb25seSBsaXN0ZW5lcjogZWxidjIuQXBwbGljYXRpb25MaXN0ZW5lcjtcbiAgcHVibGljIHJlYWRvbmx5IHRhcmdldEdyb3VwOiBlbGJ2Mi5BcHBsaWNhdGlvblRhcmdldEdyb3VwO1xuICBwdWJsaWMgcmVhZG9ubHkgZmFyZ2F0ZVNlcnZpY2U6IGVjcy5GYXJnYXRlU2VydmljZTtcbiAgcHVibGljIHJlYWRvbmx5IHdvcmtlckZhcmdhdGVTZXJ2aWNlOiBlY3MuRmFyZ2F0ZVNlcnZpY2U7XG4gIHB1YmxpYyByZWFkb25seSBhcGlSZXBvc2l0b3J5OiBlY3IuUmVwb3NpdG9yeTtcbiAgcHVibGljIHJlYWRvbmx5IHdvcmtlclJlcG9zaXRvcnk6IGVjci5SZXBvc2l0b3J5O1xuICBwdWJsaWMgcmVhZG9ubHkgYXBwU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5JU2VjcmV0O1xuICBwdWJsaWMgcmVhZG9ubHkgbG9nR3JvdXA6IGxvZ3MuTG9nR3JvdXA7XG4gIHB1YmxpYyByZWFkb25seSB3b3JrZXJMb2dHcm91cDogbG9ncy5Mb2dHcm91cDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ2FyZVN5bmNFY3NDb25zdHJ1Y3RQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB7IGNvbmZpZywgdnBjQ29uc3RydWN0LCByZHNDb25zdHJ1Y3QsIHJlZGlzQ29uc3RydWN0IH0gPSBwcm9wcztcbiAgICBjb25zdCBwcmVmaXggPSBgJHtjb25maWcucHJvamVjdE5hbWV9LSR7Y29uZmlnLmVudmlyb25tZW50fWA7XG5cbiAgICAvLyAxLiBFQ1IgUmVwb3NpdG9yaWVzIGZvciBSZWFsIEFwcGxpY2F0aW9uIERvY2tlciBJbWFnZXNcbiAgICB0aGlzLmFwaVJlcG9zaXRvcnkgPSBuZXcgZWNyLlJlcG9zaXRvcnkodGhpcywgJ0FwaVJlcG9zaXRvcnknLCB7XG4gICAgICByZXBvc2l0b3J5TmFtZTogYCR7cHJlZml4fS1hcGlgLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGVtcHR5T25EZWxldGU6IHRydWUsXG4gICAgfSk7XG5cbiAgICB0aGlzLndvcmtlclJlcG9zaXRvcnkgPSBuZXcgZWNyLlJlcG9zaXRvcnkodGhpcywgJ1dvcmtlclJlcG9zaXRvcnknLCB7XG4gICAgICByZXBvc2l0b3J5TmFtZTogYCR7cHJlZml4fS13b3JrZXJgLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGVtcHR5T25EZWxldGU6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyAyLiBDbG91ZFdhdGNoIExvZyBHcm91cCBmb3IgRUNTIEFQSSAmIFdvcmtlciBUYXNrIExvZ3NcbiAgICB0aGlzLmxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0Vjc0xvZ0dyb3VwJywge1xuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9lY3MvJHtwcmVmaXh9LWFwaWAsXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICB0aGlzLndvcmtlckxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ1dvcmtlckxvZ0dyb3VwJywge1xuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9lY3MvJHtwcmVmaXh9LXdvcmtlcmAsXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyAzLiBSb3RhdGVkIEFwcGxpY2F0aW9uIFNlY3JldHMgaW4gQVdTIFNlY3JldHMgTWFuYWdlciAoRFlOQU1JQyBHRU5FUkFUSU9OLCBaRVJPIFBMQUlOVEVYVCBERUZBVUxUUylcbiAgICB0aGlzLmFwcFNlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0FwcFNlY3JldHNWMicsIHtcbiAgICAgIHNlY3JldE5hbWU6IGAke3ByZWZpeH0vYXBwLXNlY3JldHMtdjJgLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBSb3RhdGVkIEFwcGxpY2F0aW9uIEpXVCBhbmQgU2VjdXJpdHkgS2V5cycsXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoe30pLFxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogJ2p3dF9zZWNyZXRfa2V5JyxcbiAgICAgICAgcGFzc3dvcmRMZW5ndGg6IDY0LFxuICAgICAgICBleGNsdWRlQ2hhcmFjdGVyczogJy9AXCIgXFwnXFxcXCcsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gNC4gRUNTIENsdXN0ZXJcbiAgICB0aGlzLmNsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIodGhpcywgJ0Vjc0NsdXN0ZXInLCB7XG4gICAgICBjbHVzdGVyTmFtZTogYCR7cHJlZml4fS1jbHVzdGVyYCxcbiAgICAgIHZwYzogdnBjQ29uc3RydWN0LnZwYyxcbiAgICAgIGNvbnRhaW5lckluc2lnaHRzOiBmYWxzZSwgLy8gRGlzYWJsZWQgZm9yIGNvc3Qgb3B0aW1pemF0aW9uXG4gICAgfSk7XG5cbiAgICAvLyA1LiBTRVBBUkFURSBJQU0gRXhlY3V0aW9uIFJvbGVzIGZvciBBUEkgYW5kIFdvcmtlciAoTGVhc3QgUHJpdmlsZWdlIEF1dGhvcml6YXRpb24pXG5cbiAgICAvLyBBUEkgRXhlY3V0aW9uIFJvbGUgKENhbiByZWFkIFJEUyBTZWNyZXQgKyBBcHAgU2VjcmV0KVxuICAgIGNvbnN0IGFwaUV4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0FwaUVjc1Rhc2tFeGVjdXRpb25Sb2xlJywge1xuICAgICAgcm9sZU5hbWU6IGAke3ByZWZpeH0tYXBpLWV4ZWN1dGlvbi1yb2xlYCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FtYXpvbkVDU1Rhc2tFeGVjdXRpb25Sb2xlUG9saWN5JyksXG4gICAgICBdLFxuICAgIH0pO1xuICAgIHJkc0NvbnN0cnVjdC5kYlNlY3JldC5ncmFudFJlYWQoYXBpRXhlY3V0aW9uUm9sZSk7XG4gICAgdGhpcy5hcHBTZWNyZXQuZ3JhbnRSZWFkKGFwaUV4ZWN1dGlvblJvbGUpO1xuICAgIHRoaXMuYXBpUmVwb3NpdG9yeS5ncmFudFB1bGwoYXBpRXhlY3V0aW9uUm9sZSk7XG5cbiAgICAvLyBXb3JrZXIgRXhlY3V0aW9uIFJvbGUgKENhbiByZWFkIFJEUyBTZWNyZXQgT05MWSAtIFNUUklDVExZIE5PIEFwcCBTZWNyZXQgYWNjZXNzKVxuICAgIGNvbnN0IHdvcmtlckV4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ1dvcmtlckVjc1Rhc2tFeGVjdXRpb25Sb2xlJywge1xuICAgICAgcm9sZU5hbWU6IGAke3ByZWZpeH0td29ya2VyLWV4ZWN1dGlvbi1yb2xlYCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FtYXpvbkVDU1Rhc2tFeGVjdXRpb25Sb2xlUG9saWN5JyksXG4gICAgICBdLFxuICAgIH0pO1xuICAgIHJkc0NvbnN0cnVjdC5kYlNlY3JldC5ncmFudFJlYWQod29ya2VyRXhlY3V0aW9uUm9sZSk7XG4gICAgdGhpcy53b3JrZXJSZXBvc2l0b3J5LmdyYW50UHVsbCh3b3JrZXJFeGVjdXRpb25Sb2xlKTtcblxuICAgIC8vIEVtcHR5IEFwcGxpY2F0aW9uIFRhc2sgUm9sZXMgKE5vIHVubmVlZGVkIEFXUyBBUEkgcGVybWlzc2lvbnMgYXQgcnVudGltZSlcbiAgICBjb25zdCB0YXNrUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRWNzVGFza1JvbGUnLCB7XG4gICAgICByb2xlTmFtZTogYCR7cHJlZml4fS1lY3MtdGFzay1yb2xlYCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgd29ya2VyVGFza1JvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ1dvcmtlclRhc2tSb2xlJywge1xuICAgICAgcm9sZU5hbWU6IGAke3ByZWZpeH0td29ya2VyLXRhc2stcm9sZWAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nKSxcbiAgICB9KTtcblxuICAgIC8vIDYuIENvc3QtQ29uc2Npb3VzIEZhcmdhdGUgVGFzayBEZWZpbml0aW9ucyAoMC4yNSB2Q1BVIC8gNTEyIE1CIFJBTSlcbiAgICBjb25zdCB0YXNrRGVmaW5pdGlvbiA9IG5ldyBlY3MuRmFyZ2F0ZVRhc2tEZWZpbml0aW9uKHRoaXMsICdGYXJnYXRlVGFza0RlZicsIHtcbiAgICAgIGNwdTogMjU2LCAvLyAwLjI1IHZDUFVcbiAgICAgIG1lbW9yeUxpbWl0TWlCOiA1MTIsIC8vIDUxMiBNQiBSQU1cbiAgICAgIGV4ZWN1dGlvblJvbGU6IGFwaUV4ZWN1dGlvblJvbGUsXG4gICAgICB0YXNrUm9sZTogdGFza1JvbGUsXG4gICAgfSk7XG5cbiAgICBjb25zdCB3b3JrZXJUYXNrRGVmaW5pdGlvbiA9IG5ldyBlY3MuRmFyZ2F0ZVRhc2tEZWZpbml0aW9uKHRoaXMsICdXb3JrZXJUYXNrRGVmJywge1xuICAgICAgY3B1OiAyNTYsIC8vIDAuMjUgdkNQVVxuICAgICAgbWVtb3J5TGltaXRNaUI6IDUxMiwgLy8gNTEyIE1CIFJBTVxuICAgICAgZXhlY3V0aW9uUm9sZTogd29ya2VyRXhlY3V0aW9uUm9sZSxcbiAgICAgIHRhc2tSb2xlOiB3b3JrZXJUYXNrUm9sZSxcbiAgICB9KTtcblxuICAgIC8vIDcuIFJlYWwgQXBwbGljYXRpb24gQ29udGFpbmVyIFNwZWNpZmljYXRpb25zIChDYXJlU3luYyBGYXN0QVBJIEJhY2tlbmQgJiBPdXRib3ggV29ya2VyKVxuICAgIGNvbnN0IGJhY2tlbmRQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL2JhY2tlbmQnKTtcblxuICAgIHRhc2tEZWZpbml0aW9uLmFkZENvbnRhaW5lcignQ2FyZVN5bmNBcGlDb250YWluZXInLCB7XG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21Bc3NldChiYWNrZW5kUGF0aCwge1xuICAgICAgICBmaWxlOiAnRG9ja2VyZmlsZScsXG4gICAgICB9KSxcbiAgICAgIGxvZ2dpbmc6IGVjcy5Mb2dEcml2ZXJzLmF3c0xvZ3Moe1xuICAgICAgICBzdHJlYW1QcmVmaXg6ICdjYXJlc3luYy1hcGknLFxuICAgICAgICBsb2dHcm91cDogdGhpcy5sb2dHcm91cCxcbiAgICAgIH0pLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgRU5WSVJPTk1FTlQ6IGNvbmZpZy5lbnZpcm9ubWVudCxcbiAgICAgICAgUFJPSkVDVF9OQU1FOiBjb25maWcucHJvamVjdE5hbWUsXG4gICAgICAgIFBPU1RHUkVTX0RCOiAnY2FyZXN5bmNfZGInLFxuICAgICAgICBQT1NUR1JFU19IT1NUOiByZHNDb25zdHJ1Y3QuZGF0YWJhc2VJbnN0YW5jZS5kYkluc3RhbmNlRW5kcG9pbnRBZGRyZXNzLFxuICAgICAgICBQT1NUR1JFU19QT1JUOiAnNTQzMicsXG4gICAgICAgIFJFRElTX0hPU1Q6IHJlZGlzQ29uc3RydWN0LnJlZGlzQ2x1c3Rlci5hdHRyUmVkaXNFbmRwb2ludEFkZHJlc3MsXG4gICAgICAgIFJFRElTX1BPUlQ6ICc2Mzc5JyxcbiAgICAgIH0sXG4gICAgICBzZWNyZXRzOiB7XG4gICAgICAgIFBPU1RHUkVTX1BBU1NXT1JEOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihyZHNDb25zdHJ1Y3QuZGJTZWNyZXQsICdwYXNzd29yZCcpLFxuICAgICAgICBKV1RfU0VDUkVUX0tFWTogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIodGhpcy5hcHBTZWNyZXQsICdqd3Rfc2VjcmV0X2tleScpLFxuICAgICAgfSxcbiAgICB9KS5hZGRQb3J0TWFwcGluZ3Moe1xuICAgICAgY29udGFpbmVyUG9ydDogODAwMCxcbiAgICAgIHByb3RvY29sOiBlY3MuUHJvdG9jb2wuVENQLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0Ym94IFdvcmtlciBDb250YWluZXIgKElOSkVDVFMgT05MWSBQT1NUR1JFU19QQVNTV09SRCwgTk8gQVBQIFNFQ1JFVFMpXG4gICAgd29ya2VyVGFza0RlZmluaXRpb24uYWRkQ29udGFpbmVyKCdDYXJlU3luY1dvcmtlckNvbnRhaW5lcicsIHtcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbUFzc2V0KGJhY2tlbmRQYXRoLCB7XG4gICAgICAgIGZpbGU6ICdEb2NrZXJmaWxlLndvcmtlcicsXG4gICAgICB9KSxcbiAgICAgIGxvZ2dpbmc6IGVjcy5Mb2dEcml2ZXJzLmF3c0xvZ3Moe1xuICAgICAgICBzdHJlYW1QcmVmaXg6ICdjYXJlc3luYy13b3JrZXInLFxuICAgICAgICBsb2dHcm91cDogdGhpcy53b3JrZXJMb2dHcm91cCxcbiAgICAgIH0pLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgRU5WSVJPTk1FTlQ6IGNvbmZpZy5lbnZpcm9ubWVudCxcbiAgICAgICAgUFJPSkVDVF9OQU1FOiBjb25maWcucHJvamVjdE5hbWUsXG4gICAgICAgIFBPU1RHUkVTX0RCOiAnY2FyZXN5bmNfZGInLFxuICAgICAgICBQT1NUR1JFU19IT1NUOiByZHNDb25zdHJ1Y3QuZGF0YWJhc2VJbnN0YW5jZS5kYkluc3RhbmNlRW5kcG9pbnRBZGRyZXNzLFxuICAgICAgICBQT1NUR1JFU19QT1JUOiAnNTQzMicsXG4gICAgICAgIFJFRElTX0hPU1Q6IHJlZGlzQ29uc3RydWN0LnJlZGlzQ2x1c3Rlci5hdHRyUmVkaXNFbmRwb2ludEFkZHJlc3MsXG4gICAgICAgIFJFRElTX1BPUlQ6ICc2Mzc5JyxcbiAgICAgICAgV09SS0VSX01PREU6ICdvdXRib3hfcHJvY2Vzc29yJyxcbiAgICAgIH0sXG4gICAgICBzZWNyZXRzOiB7XG4gICAgICAgIFBPU1RHUkVTX1BBU1NXT1JEOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihyZHNDb25zdHJ1Y3QuZGJTZWNyZXQsICdwYXNzd29yZCcpLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIDguIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXIgKFB1YmxpYyBTdWJuZXRzKVxuICAgIHRoaXMuYWxiID0gbmV3IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyKHRoaXMsICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlcicsIHtcbiAgICAgIGxvYWRCYWxhbmNlck5hbWU6IGAke3ByZWZpeH0tYWxiYCxcbiAgICAgIHZwYzogdnBjQ29uc3RydWN0LnZwYyxcbiAgICAgIGludGVybmV0RmFjaW5nOiB0cnVlLFxuICAgICAgc2VjdXJpdHlHcm91cDogdnBjQ29uc3RydWN0LmFsYlNlY3VyaXR5R3JvdXAsXG4gICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBVQkxJQyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyA5LiBUYXJnZXQgR3JvdXAgJiBIZWFsdGggQ2hlY2tzXG4gICAgdGhpcy50YXJnZXRHcm91cCA9IG5ldyBlbGJ2Mi5BcHBsaWNhdGlvblRhcmdldEdyb3VwKHRoaXMsICdBbGJUYXJnZXRHcm91cCcsIHtcbiAgICAgIHRhcmdldEdyb3VwTmFtZTogYCR7cHJlZml4fS10Z2AsXG4gICAgICB2cGM6IHZwY0NvbnN0cnVjdC52cGMsXG4gICAgICBwb3J0OiA4MDAwLFxuICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcbiAgICAgIHRhcmdldFR5cGU6IGVsYnYyLlRhcmdldFR5cGUuSVAsXG4gICAgICBoZWFsdGhDaGVjazoge1xuICAgICAgICBwYXRoOiAnL2FwaS92MS9oZWFsdGgnLFxuICAgICAgICBpbnRlcnZhbDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgICBoZWFsdGh5VGhyZXNob2xkQ291bnQ6IDIsXG4gICAgICAgIHVuaGVhbHRoeVRocmVzaG9sZENvdW50OiAzLFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyAxMC4gSFRUUCBMaXN0ZW5lciAoRm9yd2FyZCBQb3J0IDgwIHRvIFRhcmdldCBHcm91cClcbiAgICB0aGlzLmxpc3RlbmVyID0gdGhpcy5hbGIuYWRkTGlzdGVuZXIoJ0h0dHBMaXN0ZW5lcicsIHtcbiAgICAgIHBvcnQ6IDgwLFxuICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcbiAgICAgIGRlZmF1bHRUYXJnZXRHcm91cHM6IFt0aGlzLnRhcmdldEdyb3VwXSxcbiAgICB9KTtcblxuICAgIC8vIDExLiBBUEkgRmFyZ2F0ZSBTZXJ2aWNlIChQUklWQVRFX0lTT0xBVEVEIFN1Ym5ldHMsIEFzc2lnblB1YmxpY0lwOiBESVNBQkxFRClcbiAgICB0aGlzLmZhcmdhdGVTZXJ2aWNlID0gbmV3IGVjcy5GYXJnYXRlU2VydmljZSh0aGlzLCAnRmFyZ2F0ZVNlcnZpY2UnLCB7XG4gICAgICBzZXJ2aWNlTmFtZTogYCR7cHJlZml4fS1hcGktc2VydmljZWAsXG4gICAgICBjbHVzdGVyOiB0aGlzLmNsdXN0ZXIsXG4gICAgICB0YXNrRGVmaW5pdGlvbjogdGFza0RlZmluaXRpb24sXG4gICAgICBkZXNpcmVkQ291bnQ6IDEsXG4gICAgICBzZWN1cml0eUdyb3VwczogW3ZwY0NvbnN0cnVjdC5lY3NTZWN1cml0eUdyb3VwXSxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCwgLy8gSGFyZGVuZWQgcHJpdmF0ZSBpc29sYXRlZCBzdWJuZXQgZXhlY3V0aW9uXG4gICAgICB9LFxuICAgICAgYXNzaWduUHVibGljSXA6IGZhbHNlLCAvLyBTdHJpY3Qgbm9uLXB1YmxpYyBJUCBwbGFjZW1lbnRcbiAgICB9KTtcblxuICAgIHRoaXMudGFyZ2V0R3JvdXAuYWRkVGFyZ2V0KHRoaXMuZmFyZ2F0ZVNlcnZpY2UpO1xuXG4gICAgLy8gMTIuIE91dGJveCBXb3JrZXIgRmFyZ2F0ZSBTZXJ2aWNlIChQUklWQVRFX0lTT0xBVEVEIFN1Ym5ldHMsIEFzc2lnblB1YmxpY0lwOiBESVNBQkxFRClcbiAgICB0aGlzLndvcmtlckZhcmdhdGVTZXJ2aWNlID0gbmV3IGVjcy5GYXJnYXRlU2VydmljZSh0aGlzLCAnV29ya2VyRmFyZ2F0ZVNlcnZpY2UnLCB7XG4gICAgICBzZXJ2aWNlTmFtZTogYCR7cHJlZml4fS13b3JrZXItc2VydmljZWAsXG4gICAgICBjbHVzdGVyOiB0aGlzLmNsdXN0ZXIsXG4gICAgICB0YXNrRGVmaW5pdGlvbjogd29ya2VyVGFza0RlZmluaXRpb24sXG4gICAgICBkZXNpcmVkQ291bnQ6IDEsXG4gICAgICBzZWN1cml0eUdyb3VwczogW3ZwY0NvbnN0cnVjdC5lY3NTZWN1cml0eUdyb3VwXSxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCwgLy8gUHJpdmF0ZSBpc29sYXRlZCBzdWJuZXRzIGZvciB3b3JrZXJcbiAgICAgIH0sXG4gICAgICBhc3NpZ25QdWJsaWNJcDogZmFsc2UsIC8vIFN0cmljdGx5IG5vbi1wdWJsaWNcbiAgICB9KTtcblxuICAgIC8vIENmbk91dHB1dHMgZm9yIEFMQiAmIFNlY3JldHMgTWV0YWRhdGFcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWxiRG5zTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFsYi5sb2FkQmFsYW5jZXJEbnNOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyIFB1YmxpYyBETlMgTmFtZScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWxiVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwOi8vJHt0aGlzLmFsYi5sb2FkQmFsYW5jZXJEbnNOYW1lfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NhcmVTeW5jIEFwcGxpY2F0aW9uIFB1YmxpYyBIVFRQIEJhc2UgVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFY3NDbHVzdGVyTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNsdXN0ZXIuY2x1c3Rlck5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NhcmVTeW5jIEVDUyBDbHVzdGVyIE5hbWUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Vjc0FwaVNlcnZpY2UnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5mYXJnYXRlU2VydmljZS5zZXJ2aWNlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2FyZVN5bmMgUHJpdmF0ZSBBUEkgRmFyZ2F0ZSBTZXJ2aWNlIE5hbWUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Vjc1dvcmtlclNlcnZpY2UnLCB7XG4gICAgICB2YWx1ZTogdGhpcy53b3JrZXJGYXJnYXRlU2VydmljZS5zZXJ2aWNlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2FyZVN5bmMgUHJpdmF0ZSBPdXRib3ggV29ya2VyIEZhcmdhdGUgU2VydmljZSBOYW1lJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcHBTZWNyZXRBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hcHBTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdBV1MgU2VjcmV0cyBNYW5hZ2VyIFNlY3JldCBBUk4gZm9yIFJvdGF0ZWQgQXBwbGljYXRpb24gU2VjdXJpdHkgS2V5cycsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==