"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareSyncStack = void 0;
const cdk = require("aws-cdk-lib");
const environments_1 = require("../config/environments");
const caresync_vpc_construct_1 = require("./caresync-vpc-construct");
const caresync_rds_construct_1 = require("./caresync-rds-construct");
const caresync_redis_construct_1 = require("./caresync-redis-construct");
const caresync_ecs_construct_1 = require("./caresync-ecs-construct");
class CareSyncStack extends cdk.Stack {
    vpcConstruct;
    rdsConstruct;
    redisConstruct;
    ecsConstruct;
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
        // Instantiate Phase 12E ECS Fargate & ALB Construct
        this.ecsConstruct = new caresync_ecs_construct_1.CareSyncEcsConstruct(this, 'EcsConstruct', {
            config,
            vpcConstruct: this.vpcConstruct,
            rdsConstruct: this.rdsConstruct,
            redisConstruct: this.redisConstruct,
        });
    }
}
exports.CareSyncStack = CareSyncStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZXN5bmMtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjYXJlc3luYy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFFbkMseURBQThFO0FBQzlFLHFFQUFnRTtBQUNoRSxxRUFBZ0U7QUFDaEUseUVBQW9FO0FBQ3BFLHFFQUFnRTtBQU1oRSxNQUFhLGFBQWMsU0FBUSxHQUFHLENBQUMsS0FBSztJQUMxQixZQUFZLENBQXVCO0lBQ25DLFlBQVksQ0FBdUI7SUFDbkMsY0FBYyxDQUF5QjtJQUN2QyxZQUFZLENBQXVCO0lBRW5ELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBeUI7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQztRQUV6QiwrREFBK0Q7UUFDL0QsSUFBQSxnQ0FBaUIsRUFBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXJDLCtCQUErQjtRQUMvQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsTUFBTSxDQUFDLFdBQVc7WUFDekIsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQy9DLEtBQUssRUFBRSxNQUFNLENBQUMsV0FBVztZQUN6QixXQUFXLEVBQUUsc0NBQXNDO1NBQ3BELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RDLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTTtZQUNwQixXQUFXLEVBQUUsaUNBQWlDO1NBQy9DLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDckQsS0FBSyxFQUFFLElBQUksTUFBTSxDQUFDLGdCQUFnQixFQUFFO1lBQ3BDLFdBQVcsRUFBRSxvQ0FBb0M7U0FDbEQsQ0FBQyxDQUFDO1FBRUgsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ2pFLE1BQU07U0FDUCxDQUFDLENBQUM7UUFFSCxpREFBaUQ7UUFDakQsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLDZDQUFvQixDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDakUsTUFBTTtZQUNOLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtTQUNoQyxDQUFDLENBQUM7UUFFSCxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLGlEQUFzQixDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN2RSxNQUFNO1lBQ04sWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1NBQ2hDLENBQUMsQ0FBQztRQUVILG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksNkNBQW9CLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUNqRSxNQUFNO1lBQ04sWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMvQixjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7U0FDcEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBNURELHNDQTREQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVudmlyb25tZW50Q29uZmlnLCBhcHBseVN0YW5kYXJkVGFncyB9IGZyb20gJy4uL2NvbmZpZy9lbnZpcm9ubWVudHMnO1xuaW1wb3J0IHsgQ2FyZVN5bmNWcGNDb25zdHJ1Y3QgfSBmcm9tICcuL2NhcmVzeW5jLXZwYy1jb25zdHJ1Y3QnO1xuaW1wb3J0IHsgQ2FyZVN5bmNSZHNDb25zdHJ1Y3QgfSBmcm9tICcuL2NhcmVzeW5jLXJkcy1jb25zdHJ1Y3QnO1xuaW1wb3J0IHsgQ2FyZVN5bmNSZWRpc0NvbnN0cnVjdCB9IGZyb20gJy4vY2FyZXN5bmMtcmVkaXMtY29uc3RydWN0JztcbmltcG9ydCB7IENhcmVTeW5jRWNzQ29uc3RydWN0IH0gZnJvbSAnLi9jYXJlc3luYy1lY3MtY29uc3RydWN0JztcblxuZXhwb3J0IGludGVyZmFjZSBDYXJlU3luY1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGNvbmZpZzogRW52aXJvbm1lbnRDb25maWc7XG59XG5cbmV4cG9ydCBjbGFzcyBDYXJlU3luY1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHZwY0NvbnN0cnVjdDogQ2FyZVN5bmNWcGNDb25zdHJ1Y3Q7XG4gIHB1YmxpYyByZWFkb25seSByZHNDb25zdHJ1Y3Q6IENhcmVTeW5jUmRzQ29uc3RydWN0O1xuICBwdWJsaWMgcmVhZG9ubHkgcmVkaXNDb25zdHJ1Y3Q6IENhcmVTeW5jUmVkaXNDb25zdHJ1Y3Q7XG4gIHB1YmxpYyByZWFkb25seSBlY3NDb25zdHJ1Y3Q6IENhcmVTeW5jRWNzQ29uc3RydWN0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDYXJlU3luY1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgY29uZmlnIH0gPSBwcm9wcztcblxuICAgIC8vIEFwcGx5IHN0YW5kYXJkIGhhY2thdGhvbiB0YWdzIGFjcm9zcyBhbGwgQ0RLIHN0YWNrIHJlc291cmNlc1xuICAgIGFwcGx5U3RhbmRhcmRUYWdzKHRoaXMsIGNvbmZpZy50YWdzKTtcblxuICAgIC8vIENmbk91dHB1dCBmb3Igc3RhY2sgbWV0YWRhdGFcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHJvamVjdE5hbWUnLCB7XG4gICAgICB2YWx1ZTogY29uZmlnLnByb2plY3ROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBQcm9qZWN0IElkZW50aWZpZXInLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RlcGxveW1lbnRFbnZpcm9ubWVudCcsIHtcbiAgICAgIHZhbHVlOiBjb25maWcuZW52aXJvbm1lbnQsXG4gICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBEZXBsb3ltZW50IEVudmlyb25tZW50IChkZW1vKScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGFyZ2V0UmVnaW9uJywge1xuICAgICAgdmFsdWU6IGNvbmZpZy5yZWdpb24sXG4gICAgICBkZXNjcmlwdGlvbjogJ1ByaW1hcnkgQVdTIFJlZ2lvbiAoYXAtc291dGgtMSknLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01vbnRobHlCdWRnZXRBbGVydFRhcmdldFVTRCcsIHtcbiAgICAgIHZhbHVlOiBgJCR7Y29uZmlnLm1vbnRobHlCdWRnZXRVU0R9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IENvc3QgQWxlcnQgQ2VpbGluZyAoVVNEIDIwKScsXG4gICAgfSk7XG5cbiAgICAvLyBJbnN0YW50aWF0ZSBQaGFzZSAxMkIgTmV0d29yayAmIFN1Ym5ldCBDb25zdHJ1Y3RcbiAgICB0aGlzLnZwY0NvbnN0cnVjdCA9IG5ldyBDYXJlU3luY1ZwY0NvbnN0cnVjdCh0aGlzLCAnVnBjQ29uc3RydWN0Jywge1xuICAgICAgY29uZmlnLFxuICAgIH0pO1xuXG4gICAgLy8gSW5zdGFudGlhdGUgUGhhc2UgMTJDIFJEUyBQb3N0Z3JlU1FMIENvbnN0cnVjdFxuICAgIHRoaXMucmRzQ29uc3RydWN0ID0gbmV3IENhcmVTeW5jUmRzQ29uc3RydWN0KHRoaXMsICdSZHNDb25zdHJ1Y3QnLCB7XG4gICAgICBjb25maWcsXG4gICAgICB2cGNDb25zdHJ1Y3Q6IHRoaXMudnBjQ29uc3RydWN0LFxuICAgIH0pO1xuXG4gICAgLy8gSW5zdGFudGlhdGUgUGhhc2UgMTJEIEVsYXN0aUNhY2hlIFJlZGlzIENvbnN0cnVjdFxuICAgIHRoaXMucmVkaXNDb25zdHJ1Y3QgPSBuZXcgQ2FyZVN5bmNSZWRpc0NvbnN0cnVjdCh0aGlzLCAnUmVkaXNDb25zdHJ1Y3QnLCB7XG4gICAgICBjb25maWcsXG4gICAgICB2cGNDb25zdHJ1Y3Q6IHRoaXMudnBjQ29uc3RydWN0LFxuICAgIH0pO1xuXG4gICAgLy8gSW5zdGFudGlhdGUgUGhhc2UgMTJFIEVDUyBGYXJnYXRlICYgQUxCIENvbnN0cnVjdFxuICAgIHRoaXMuZWNzQ29uc3RydWN0ID0gbmV3IENhcmVTeW5jRWNzQ29uc3RydWN0KHRoaXMsICdFY3NDb25zdHJ1Y3QnLCB7XG4gICAgICBjb25maWcsXG4gICAgICB2cGNDb25zdHJ1Y3Q6IHRoaXMudnBjQ29uc3RydWN0LFxuICAgICAgcmRzQ29uc3RydWN0OiB0aGlzLnJkc0NvbnN0cnVjdCxcbiAgICAgIHJlZGlzQ29uc3RydWN0OiB0aGlzLnJlZGlzQ29uc3RydWN0LFxuICAgIH0pO1xuICB9XG59XG4iXX0=