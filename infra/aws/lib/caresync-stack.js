"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareSyncStack = void 0;
const cdk = require("aws-cdk-lib");
const environments_1 = require("../config/environments");
const caresync_vpc_construct_1 = require("./caresync-vpc-construct");
const caresync_rds_construct_1 = require("./caresync-rds-construct");
const caresync_redis_construct_1 = require("./caresync-redis-construct");
const caresync_ecs_construct_1 = require("./caresync-ecs-construct");
const caresync_frontend_construct_1 = require("./caresync-frontend-construct");
class CareSyncStack extends cdk.Stack {
    vpcConstruct;
    rdsConstruct;
    redisConstruct;
    ecsConstruct;
    frontendConstruct;
    constructor(scope, id, props) {
        super(scope, id, props);
        const { config } = props;
        // Apply standard hackathon tags across all CDK stack resources
        (0, environments_1.applyStandardTags)(this, config.tags);
        // CfnOutput for stack metadata
        new cdk.CfnOutput(this, 'ProjectName', {
            value: config.projectName,
            description: 'CareSync Project Identifier',
        });
        new cdk.CfnOutput(this, 'DeploymentEnvironment', {
            value: config.environment,
            description: 'Target Deployment Environment (demo)',
        });
        new cdk.CfnOutput(this, 'TargetRegion', {
            value: config.region,
            description: 'Primary AWS Region (ap-south-1)',
        });
        new cdk.CfnOutput(this, 'MonthlyBudgetAlertTargetUSD', {
            value: `$${config.monthlyBudgetUSD}`,
            description: 'Target Cost Alert Ceiling (USD 20)',
        });
        // Instantiate Phase 12B Network & Subnet Construct
        this.vpcConstruct = new caresync_vpc_construct_1.CareSyncVpcConstruct(this, 'VpcConstruct', {
            config,
        });
        // Instantiate Phase 12C RDS PostgreSQL Construct
        this.rdsConstruct = new caresync_rds_construct_1.CareSyncRdsConstruct(this, 'RdsConstruct', {
            config,
            vpcConstruct: this.vpcConstruct,
        });
        // Instantiate Phase 12D ElastiCache Redis Construct
        this.redisConstruct = new caresync_redis_construct_1.CareSyncRedisConstruct(this, 'RedisConstruct', {
            config,
            vpcConstruct: this.vpcConstruct,
        });
        // Instantiate Phase 12E/12F ECS Fargate & ALB Construct
        this.ecsConstruct = new caresync_ecs_construct_1.CareSyncEcsConstruct(this, 'EcsConstruct', {
            config,
            vpcConstruct: this.vpcConstruct,
            rdsConstruct: this.rdsConstruct,
            redisConstruct: this.redisConstruct,
        });
        // Instantiate Phase 12G Frontend S3 + CloudFront CDN Construct
        this.frontendConstruct = new caresync_frontend_construct_1.CareSyncFrontendConstruct(this, 'FrontendConstruct', {
            config,
            ecsConstruct: this.ecsConstruct,
        });
    }
}
exports.CareSyncStack = CareSyncStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZXN5bmMtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjYXJlc3luYy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFFbkMseURBQThFO0FBQzlFLHFFQUFnRTtBQUNoRSxxRUFBZ0U7QUFDaEUseUVBQW9FO0FBQ3BFLHFFQUFnRTtBQUNoRSwrRUFBMEU7QUFNMUUsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUIsWUFBWSxDQUF1QjtJQUNuQyxZQUFZLENBQXVCO0lBQ25DLGNBQWMsQ0FBeUI7SUFDdkMsWUFBWSxDQUF1QjtJQUNuQyxpQkFBaUIsQ0FBNEI7SUFFN0QsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRXpCLCtEQUErRDtRQUMvRCxJQUFBLGdDQUFpQixFQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFckMsK0JBQStCO1FBQy9CLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxNQUFNLENBQUMsV0FBVztZQUN6QixXQUFXLEVBQUUsNkJBQTZCO1NBQzNDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDL0MsS0FBSyxFQUFFLE1BQU0sQ0FBQyxXQUFXO1lBQ3pCLFdBQVcsRUFBRSxzQ0FBc0M7U0FDcEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDdEMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNO1lBQ3BCLFdBQVcsRUFBRSxpQ0FBaUM7U0FDL0MsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSw2QkFBNkIsRUFBRTtZQUNyRCxLQUFLLEVBQUUsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7WUFDcEMsV0FBVyxFQUFFLG9DQUFvQztTQUNsRCxDQUFDLENBQUM7UUFFSCxtREFBbUQ7UUFDbkQsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLDZDQUFvQixDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDakUsTUFBTTtTQUNQLENBQUMsQ0FBQztRQUVILGlEQUFpRDtRQUNqRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksNkNBQW9CLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUNqRSxNQUFNO1lBQ04sWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1NBQ2hDLENBQUMsQ0FBQztRQUVILG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksaURBQXNCLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3ZFLE1BQU07WUFDTixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsd0RBQXdEO1FBQ3hELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ2pFLE1BQU07WUFDTixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztTQUNwQyxDQUFDLENBQUM7UUFFSCwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksdURBQXlCLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ2hGLE1BQU07WUFDTixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7U0FDaEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbkVELHNDQW1FQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVudmlyb25tZW50Q29uZmlnLCBhcHBseVN0YW5kYXJkVGFncyB9IGZyb20gJy4uL2NvbmZpZy9lbnZpcm9ubWVudHMnO1xuaW1wb3J0IHsgQ2FyZVN5bmNWcGNDb25zdHJ1Y3QgfSBmcm9tICcuL2NhcmVzeW5jLXZwYy1jb25zdHJ1Y3QnO1xuaW1wb3J0IHsgQ2FyZVN5bmNSZHNDb25zdHJ1Y3QgfSBmcm9tICcuL2NhcmVzeW5jLXJkcy1jb25zdHJ1Y3QnO1xuaW1wb3J0IHsgQ2FyZVN5bmNSZWRpc0NvbnN0cnVjdCB9IGZyb20gJy4vY2FyZXN5bmMtcmVkaXMtY29uc3RydWN0JztcbmltcG9ydCB7IENhcmVTeW5jRWNzQ29uc3RydWN0IH0gZnJvbSAnLi9jYXJlc3luYy1lY3MtY29uc3RydWN0JztcbmltcG9ydCB7IENhcmVTeW5jRnJvbnRlbmRDb25zdHJ1Y3QgfSBmcm9tICcuL2NhcmVzeW5jLWZyb250ZW5kLWNvbnN0cnVjdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2FyZVN5bmNTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBjb25maWc6IEVudmlyb25tZW50Q29uZmlnO1xufVxuXG5leHBvcnQgY2xhc3MgQ2FyZVN5bmNTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSB2cGNDb25zdHJ1Y3Q6IENhcmVTeW5jVnBjQ29uc3RydWN0O1xuICBwdWJsaWMgcmVhZG9ubHkgcmRzQ29uc3RydWN0OiBDYXJlU3luY1Jkc0NvbnN0cnVjdDtcbiAgcHVibGljIHJlYWRvbmx5IHJlZGlzQ29uc3RydWN0OiBDYXJlU3luY1JlZGlzQ29uc3RydWN0O1xuICBwdWJsaWMgcmVhZG9ubHkgZWNzQ29uc3RydWN0OiBDYXJlU3luY0Vjc0NvbnN0cnVjdDtcbiAgcHVibGljIHJlYWRvbmx5IGZyb250ZW5kQ29uc3RydWN0OiBDYXJlU3luY0Zyb250ZW5kQ29uc3RydWN0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDYXJlU3luY1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgY29uZmlnIH0gPSBwcm9wcztcblxuICAgIC8vIEFwcGx5IHN0YW5kYXJkIGhhY2thdGhvbiB0YWdzIGFjcm9zcyBhbGwgQ0RLIHN0YWNrIHJlc291cmNlc1xuICAgIGFwcGx5U3RhbmRhcmRUYWdzKHRoaXMsIGNvbmZpZy50YWdzKTtcblxuICAgIC8vIENmbk91dHB1dCBmb3Igc3RhY2sgbWV0YWRhdGFcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHJvamVjdE5hbWUnLCB7XG4gICAgICB2YWx1ZTogY29uZmlnLnByb2plY3ROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBQcm9qZWN0IElkZW50aWZpZXInLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RlcGxveW1lbnRFbnZpcm9ubWVudCcsIHtcbiAgICAgIHZhbHVlOiBjb25maWcuZW52aXJvbm1lbnQsXG4gICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBEZXBsb3ltZW50IEVudmlyb25tZW50IChkZW1vKScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGFyZ2V0UmVnaW9uJywge1xuICAgICAgdmFsdWU6IGNvbmZpZy5yZWdpb24sXG4gICAgICBkZXNjcmlwdGlvbjogJ1ByaW1hcnkgQVdTIFJlZ2lvbiAoYXAtc291dGgtMSknLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01vbnRobHlCdWRnZXRBbGVydFRhcmdldFVTRCcsIHtcbiAgICAgIHZhbHVlOiBgJCR7Y29uZmlnLm1vbnRobHlCdWRnZXRVU0R9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IENvc3QgQWxlcnQgQ2VpbGluZyAoVVNEIDIwKScsXG4gICAgfSk7XG5cbiAgICAvLyBJbnN0YW50aWF0ZSBQaGFzZSAxMkIgTmV0d29yayAmIFN1Ym5ldCBDb25zdHJ1Y3RcbiAgICB0aGlzLnZwY0NvbnN0cnVjdCA9IG5ldyBDYXJlU3luY1ZwY0NvbnN0cnVjdCh0aGlzLCAnVnBjQ29uc3RydWN0Jywge1xuICAgICAgY29uZmlnLFxuICAgIH0pO1xuXG4gICAgLy8gSW5zdGFudGlhdGUgUGhhc2UgMTJDIFJEUyBQb3N0Z3JlU1FMIENvbnN0cnVjdFxuICAgIHRoaXMucmRzQ29uc3RydWN0ID0gbmV3IENhcmVTeW5jUmRzQ29uc3RydWN0KHRoaXMsICdSZHNDb25zdHJ1Y3QnLCB7XG4gICAgICBjb25maWcsXG4gICAgICB2cGNDb25zdHJ1Y3Q6IHRoaXMudnBjQ29uc3RydWN0LFxuICAgIH0pO1xuXG4gICAgLy8gSW5zdGFudGlhdGUgUGhhc2UgMTJEIEVsYXN0aUNhY2hlIFJlZGlzIENvbnN0cnVjdFxuICAgIHRoaXMucmVkaXNDb25zdHJ1Y3QgPSBuZXcgQ2FyZVN5bmNSZWRpc0NvbnN0cnVjdCh0aGlzLCAnUmVkaXNDb25zdHJ1Y3QnLCB7XG4gICAgICBjb25maWcsXG4gICAgICB2cGNDb25zdHJ1Y3Q6IHRoaXMudnBjQ29uc3RydWN0LFxuICAgIH0pO1xuXG4gICAgLy8gSW5zdGFudGlhdGUgUGhhc2UgMTJFLzEyRiBFQ1MgRmFyZ2F0ZSAmIEFMQiBDb25zdHJ1Y3RcbiAgICB0aGlzLmVjc0NvbnN0cnVjdCA9IG5ldyBDYXJlU3luY0Vjc0NvbnN0cnVjdCh0aGlzLCAnRWNzQ29uc3RydWN0Jywge1xuICAgICAgY29uZmlnLFxuICAgICAgdnBjQ29uc3RydWN0OiB0aGlzLnZwY0NvbnN0cnVjdCxcbiAgICAgIHJkc0NvbnN0cnVjdDogdGhpcy5yZHNDb25zdHJ1Y3QsXG4gICAgICByZWRpc0NvbnN0cnVjdDogdGhpcy5yZWRpc0NvbnN0cnVjdCxcbiAgICB9KTtcblxuICAgIC8vIEluc3RhbnRpYXRlIFBoYXNlIDEyRyBGcm9udGVuZCBTMyArIENsb3VkRnJvbnQgQ0ROIENvbnN0cnVjdFxuICAgIHRoaXMuZnJvbnRlbmRDb25zdHJ1Y3QgPSBuZXcgQ2FyZVN5bmNGcm9udGVuZENvbnN0cnVjdCh0aGlzLCAnRnJvbnRlbmRDb25zdHJ1Y3QnLCB7XG4gICAgICBjb25maWcsXG4gICAgICBlY3NDb25zdHJ1Y3Q6IHRoaXMuZWNzQ29uc3RydWN0LFxuICAgIH0pO1xuICB9XG59XG4iXX0=