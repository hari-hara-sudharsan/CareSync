"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareSyncEcsConstruct = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const elbv2 = require("aws-cdk-lib/aws-elasticloadbalancingv2");
const iam = require("aws-cdk-lib/aws-iam");
const logs = require("aws-cdk-lib/aws-logs");
const constructs_1 = require("constructs");
class CareSyncEcsConstruct extends constructs_1.Construct {
    cluster;
    alb;
    listener;
    targetGroup;
    fargateService;
    logGroup;
    constructor(scope, id, props) {
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
exports.CareSyncEcsConstruct = CareSyncEcsConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZXN5bmMtZWNzLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhcmVzeW5jLWVjcy1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDJDQUEyQztBQUMzQywyQ0FBMkM7QUFDM0MsZ0VBQWdFO0FBQ2hFLDJDQUEyQztBQUMzQyw2Q0FBNkM7QUFDN0MsMkNBQXVDO0FBYXZDLE1BQWEsb0JBQXFCLFNBQVEsc0JBQVM7SUFDakMsT0FBTyxDQUFjO0lBQ3JCLEdBQUcsQ0FBZ0M7SUFDbkMsUUFBUSxDQUE0QjtJQUNwQyxXQUFXLENBQStCO0lBQzFDLGNBQWMsQ0FBcUI7SUFDbkMsUUFBUSxDQUFnQjtJQUV4QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdDO1FBQ3hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUNyRSxNQUFNLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRTdELDRDQUE0QztRQUM1QyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JELFlBQVksRUFBRSxZQUFZLE1BQU0sTUFBTTtZQUN0QyxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRO1lBQ3RDLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDekMsQ0FBQyxDQUFDO1FBRUgsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDakQsV0FBVyxFQUFFLEdBQUcsTUFBTSxVQUFVO1lB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QkFDVixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsaUVBQWlFO2FBQ3JHO1lBQ0QsY0FBYyxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRWhELDhCQUE4QjtRQUM5QixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7WUFDbkMsV0FBVyxFQUFFLG9EQUFvRDtTQUNsRSxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNoQyxLQUFLLEVBQUUsVUFBVSxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFO1lBQy9DLFdBQVcsRUFBRSwyQ0FBMkM7U0FDekQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQy9CLFdBQVcsRUFBRSwyQkFBMkI7U0FDekMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXO1lBQ3RDLFdBQVcsRUFBRSwrQkFBK0I7U0FDN0MsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBckpELG9EQXFKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBlbGJ2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2xvYWRiYWxhbmNpbmd2Mic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRW52aXJvbm1lbnRDb25maWcgfSBmcm9tICcuLi9jb25maWcvZW52aXJvbm1lbnRzJztcbmltcG9ydCB7IENhcmVTeW5jVnBjQ29uc3RydWN0IH0gZnJvbSAnLi9jYXJlc3luYy12cGMtY29uc3RydWN0JztcbmltcG9ydCB7IENhcmVTeW5jUmRzQ29uc3RydWN0IH0gZnJvbSAnLi9jYXJlc3luYy1yZHMtY29uc3RydWN0JztcbmltcG9ydCB7IENhcmVTeW5jUmVkaXNDb25zdHJ1Y3QgfSBmcm9tICcuL2NhcmVzeW5jLXJlZGlzLWNvbnN0cnVjdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2FyZVN5bmNFY3NDb25zdHJ1Y3RQcm9wcyB7XG4gIGNvbmZpZzogRW52aXJvbm1lbnRDb25maWc7XG4gIHZwY0NvbnN0cnVjdDogQ2FyZVN5bmNWcGNDb25zdHJ1Y3Q7XG4gIHJkc0NvbnN0cnVjdDogQ2FyZVN5bmNSZHNDb25zdHJ1Y3Q7XG4gIHJlZGlzQ29uc3RydWN0OiBDYXJlU3luY1JlZGlzQ29uc3RydWN0O1xufVxuXG5leHBvcnQgY2xhc3MgQ2FyZVN5bmNFY3NDb25zdHJ1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgY2x1c3RlcjogZWNzLkNsdXN0ZXI7XG4gIHB1YmxpYyByZWFkb25seSBhbGI6IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyO1xuICBwdWJsaWMgcmVhZG9ubHkgbGlzdGVuZXI6IGVsYnYyLkFwcGxpY2F0aW9uTGlzdGVuZXI7XG4gIHB1YmxpYyByZWFkb25seSB0YXJnZXRHcm91cDogZWxidjIuQXBwbGljYXRpb25UYXJnZXRHcm91cDtcbiAgcHVibGljIHJlYWRvbmx5IGZhcmdhdGVTZXJ2aWNlOiBlY3MuRmFyZ2F0ZVNlcnZpY2U7XG4gIHB1YmxpYyByZWFkb25seSBsb2dHcm91cDogbG9ncy5Mb2dHcm91cDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ2FyZVN5bmNFY3NDb25zdHJ1Y3RQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB7IGNvbmZpZywgdnBjQ29uc3RydWN0LCByZHNDb25zdHJ1Y3QsIHJlZGlzQ29uc3RydWN0IH0gPSBwcm9wcztcbiAgICBjb25zdCBwcmVmaXggPSBgJHtjb25maWcucHJvamVjdE5hbWV9LSR7Y29uZmlnLmVudmlyb25tZW50fWA7XG5cbiAgICAvLyAxLiBDbG91ZFdhdGNoIExvZyBHcm91cCBmb3IgRUNTIFRhc2sgTG9nc1xuICAgIHRoaXMubG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnRWNzTG9nR3JvdXAnLCB7XG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2Vjcy8ke3ByZWZpeH0tYXBpYCxcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIDIuIEVDUyBDbHVzdGVyXG4gICAgdGhpcy5jbHVzdGVyID0gbmV3IGVjcy5DbHVzdGVyKHRoaXMsICdFY3NDbHVzdGVyJywge1xuICAgICAgY2x1c3Rlck5hbWU6IGAke3ByZWZpeH0tY2x1c3RlcmAsXG4gICAgICB2cGM6IHZwY0NvbnN0cnVjdC52cGMsXG4gICAgICBjb250YWluZXJJbnNpZ2h0czogZmFsc2UsIC8vIERpc2FibGVkIGZvciBjb3N0IG9wdGltaXphdGlvblxuICAgIH0pO1xuXG4gICAgLy8gMy4gSUFNIEV4ZWN1dGlvbiBSb2xlICYgVGFzayBSb2xlXG4gICAgY29uc3QgdGFza0V4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0Vjc1Rhc2tFeGVjdXRpb25Sb2xlJywge1xuICAgICAgcm9sZU5hbWU6IGAke3ByZWZpeH0tZWNzLWV4ZWN1dGlvbi1yb2xlYCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FtYXpvbkVDU1Rhc2tFeGVjdXRpb25Sb2xlUG9saWN5JyksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgU2VjcmV0cyBNYW5hZ2VyIHJlYWQgcGVybWlzc2lvbiBmb3IgUkRTIHBhc3N3b3JkIHJldHJpZXZhbFxuICAgIHJkc0NvbnN0cnVjdC5kYlNlY3JldC5ncmFudFJlYWQodGFza0V4ZWN1dGlvblJvbGUpO1xuXG4gICAgY29uc3QgdGFza1JvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0Vjc1Rhc2tSb2xlJywge1xuICAgICAgcm9sZU5hbWU6IGAke3ByZWZpeH0tZWNzLXRhc2stcm9sZWAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nKSxcbiAgICB9KTtcblxuICAgIC8vIDQuIENvc3QtQ29uc2Npb3VzIEZhcmdhdGUgVGFzayBEZWZpbml0aW9uICgwLjI1IHZDUFUgLyA1MTIgTUIgUkFNKVxuICAgIGNvbnN0IHRhc2tEZWZpbml0aW9uID0gbmV3IGVjcy5GYXJnYXRlVGFza0RlZmluaXRpb24odGhpcywgJ0ZhcmdhdGVUYXNrRGVmJywge1xuICAgICAgY3B1OiAyNTYsIC8vIDAuMjUgdkNQVVxuICAgICAgbWVtb3J5TGltaXRNaUI6IDUxMiwgLy8gNTEyIE1CIFJBTVxuICAgICAgZXhlY3V0aW9uUm9sZTogdGFza0V4ZWN1dGlvblJvbGUsXG4gICAgICB0YXNrUm9sZTogdGFza1JvbGUsXG4gICAgfSk7XG5cbiAgICAvLyA1LiBDb250YWluZXIgU3BlY2lmaWNhdGlvbiAoQ2FyZVN5bmMgRmFzdEFQSSBCYWNrZW5kICYgV29ya2VyKVxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRhc2tEZWZpbml0aW9uLmFkZENvbnRhaW5lcignQ2FyZVN5bmNBcGlDb250YWluZXInLCB7XG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgncHVibGljLmVjci5hd3Mvbmdpbngvbmdpbng6bGF0ZXN0JyksIC8vIFBsYWNlaG9sZGVyIGRlbW9uc3RyYXRpb24gY29udGFpbmVyIGltYWdlXG4gICAgICBsb2dnaW5nOiBlY3MuTG9nRHJpdmVycy5hd3NMb2dzKHtcbiAgICAgICAgc3RyZWFtUHJlZml4OiAnY2FyZXN5bmMtYXBpJyxcbiAgICAgICAgbG9nR3JvdXA6IHRoaXMubG9nR3JvdXAsXG4gICAgICB9KSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIEVOVklST05NRU5UOiBjb25maWcuZW52aXJvbm1lbnQsXG4gICAgICAgIFBST0pFQ1RfTkFNRTogY29uZmlnLnByb2plY3ROYW1lLFxuICAgICAgICBQT1NUR1JFU19EQjogJ2NhcmVzeW5jX2RiJyxcbiAgICAgICAgUE9TVEdSRVNfSE9TVDogcmRzQ29uc3RydWN0LmRhdGFiYXNlSW5zdGFuY2UuZGJJbnN0YW5jZUVuZHBvaW50QWRkcmVzcyxcbiAgICAgICAgUE9TVEdSRVNfUE9SVDogJzU0MzInLFxuICAgICAgICBSRURJU19IT1NUOiByZWRpc0NvbnN0cnVjdC5yZWRpc0NsdXN0ZXIuYXR0clJlZGlzRW5kcG9pbnRBZGRyZXNzLFxuICAgICAgICBSRURJU19QT1JUOiAnNjM3OScsXG4gICAgICB9LFxuICAgICAgc2VjcmV0czoge1xuICAgICAgICBQT1NUR1JFU19QQVNTV09SRDogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIocmRzQ29uc3RydWN0LmRiU2VjcmV0LCAncGFzc3dvcmQnKSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb250YWluZXIuYWRkUG9ydE1hcHBpbmdzKHtcbiAgICAgIGNvbnRhaW5lclBvcnQ6IDgwMDAsXG4gICAgICBwcm90b2NvbDogZWNzLlByb3RvY29sLlRDUCxcbiAgICB9KTtcblxuICAgIC8vIDYuIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXIgKFB1YmxpYyBTdWJuZXRzKVxuICAgIHRoaXMuYWxiID0gbmV3IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyKHRoaXMsICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlcicsIHtcbiAgICAgIGxvYWRCYWxhbmNlck5hbWU6IGAke3ByZWZpeH0tYWxiYCxcbiAgICAgIHZwYzogdnBjQ29uc3RydWN0LnZwYyxcbiAgICAgIGludGVybmV0RmFjaW5nOiB0cnVlLFxuICAgICAgc2VjdXJpdHlHcm91cDogdnBjQ29uc3RydWN0LmFsYlNlY3VyaXR5R3JvdXAsXG4gICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBVQkxJQyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyA3LiBUYXJnZXQgR3JvdXAgJiBIZWFsdGggQ2hlY2tzXG4gICAgdGhpcy50YXJnZXRHcm91cCA9IG5ldyBlbGJ2Mi5BcHBsaWNhdGlvblRhcmdldEdyb3VwKHRoaXMsICdBbGJUYXJnZXRHcm91cCcsIHtcbiAgICAgIHRhcmdldEdyb3VwTmFtZTogYCR7cHJlZml4fS10Z2AsXG4gICAgICB2cGM6IHZwY0NvbnN0cnVjdC52cGMsXG4gICAgICBwb3J0OiA4MDAwLFxuICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcbiAgICAgIHRhcmdldFR5cGU6IGVsYnYyLlRhcmdldFR5cGUuSVAsXG4gICAgICBoZWFsdGhDaGVjazoge1xuICAgICAgICBwYXRoOiAnL2FwaS92MS9oZWFsdGgnLFxuICAgICAgICBpbnRlcnZhbDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgICBoZWFsdGh5VGhyZXNob2xkQ291bnQ6IDIsXG4gICAgICAgIHVuaGVhbHRoeVRocmVzaG9sZENvdW50OiAzLFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyA4LiBIVFRQIExpc3RlbmVyIChGb3J3YXJkIFBvcnQgODAgdG8gVGFyZ2V0IEdyb3VwKVxuICAgIHRoaXMubGlzdGVuZXIgPSB0aGlzLmFsYi5hZGRMaXN0ZW5lcignSHR0cExpc3RlbmVyJywge1xuICAgICAgcG9ydDogODAsXG4gICAgICBwcm90b2NvbDogZWxidjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQLFxuICAgICAgZGVmYXVsdFRhcmdldEdyb3VwczogW3RoaXMudGFyZ2V0R3JvdXBdLFxuICAgIH0pO1xuXG4gICAgLy8gOS4gRmFyZ2F0ZSBTZXJ2aWNlIChUYXNrcyBydW4gd2l0aCBzZWN1cml0eSBncm91cCBpc29sYXRpb24pXG4gICAgdGhpcy5mYXJnYXRlU2VydmljZSA9IG5ldyBlY3MuRmFyZ2F0ZVNlcnZpY2UodGhpcywgJ0ZhcmdhdGVTZXJ2aWNlJywge1xuICAgICAgc2VydmljZU5hbWU6IGAke3ByZWZpeH0tYXBpLXNlcnZpY2VgLFxuICAgICAgY2x1c3RlcjogdGhpcy5jbHVzdGVyLFxuICAgICAgdGFza0RlZmluaXRpb246IHRhc2tEZWZpbml0aW9uLFxuICAgICAgZGVzaXJlZENvdW50OiAxLCAvLyBTaW5nbGUgaW5zdGFuY2UgY29zdC1jb25zY2lvdXMgZGVwbG95bWVudFxuICAgICAgc2VjdXJpdHlHcm91cHM6IFt2cGNDb25zdHJ1Y3QuZWNzU2VjdXJpdHlHcm91cF0sXG4gICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBVQkxJQywgLy8gUHVibGljIHN1Ym5ldCB0YXNrIGV4ZWN1dGlvbiBlbnN1cmVzIHplcm8tTkFUIEFQSSBjb25uZWN0aXZpdHlcbiAgICAgIH0sXG4gICAgICBhc3NpZ25QdWJsaWNJcDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIHRoaXMudGFyZ2V0R3JvdXAuYWRkVGFyZ2V0KHRoaXMuZmFyZ2F0ZVNlcnZpY2UpO1xuXG4gICAgLy8gQ2ZuT3V0cHV0cyBmb3IgQUxCIE1ldGFkYXRhXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FsYkRuc05hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hbGIubG9hZEJhbGFuY2VyRG5zTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2FyZVN5bmMgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlciBQdWJsaWMgRE5TIE5hbWUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FsYlVybCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cDovLyR7dGhpcy5hbGIubG9hZEJhbGFuY2VyRG5zTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBBcHBsaWNhdGlvbiBQdWJsaWMgSFRUUCBCYXNlIFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRWNzQ2x1c3Rlck5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jbHVzdGVyLmNsdXN0ZXJOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBFQ1MgQ2x1c3RlciBOYW1lJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFY3NTZXJ2aWNlTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmZhcmdhdGVTZXJ2aWNlLnNlcnZpY2VOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBGYXJnYXRlIFNlcnZpY2UgTmFtZScsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==