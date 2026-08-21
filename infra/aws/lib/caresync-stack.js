"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareSyncStack = void 0;
const cdk = require("aws-cdk-lib");
const environments_1 = require("../config/environments");
const caresync_vpc_construct_1 = require("./caresync-vpc-construct");
const caresync_rds_construct_1 = require("./caresync-rds-construct");
class CareSyncStack extends cdk.Stack {
    vpcConstruct;
    rdsConstruct;
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
    }
}
exports.CareSyncStack = CareSyncStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZXN5bmMtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjYXJlc3luYy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFFbkMseURBQThFO0FBQzlFLHFFQUFnRTtBQUNoRSxxRUFBZ0U7QUFNaEUsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUIsWUFBWSxDQUF1QjtJQUNuQyxZQUFZLENBQXVCO0lBRW5ELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBeUI7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQztRQUV6QiwrREFBK0Q7UUFDL0QsSUFBQSxnQ0FBaUIsRUFBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXJDLCtCQUErQjtRQUMvQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsTUFBTSxDQUFDLFdBQVc7WUFDekIsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQy9DLEtBQUssRUFBRSxNQUFNLENBQUMsV0FBVztZQUN6QixXQUFXLEVBQUUsc0NBQXNDO1NBQ3BELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RDLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTTtZQUNwQixXQUFXLEVBQUUsaUNBQWlDO1NBQy9DLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDckQsS0FBSyxFQUFFLElBQUksTUFBTSxDQUFDLGdCQUFnQixFQUFFO1lBQ3BDLFdBQVcsRUFBRSxvQ0FBb0M7U0FDbEQsQ0FBQyxDQUFDO1FBRUgsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ2pFLE1BQU07U0FDUCxDQUFDLENBQUM7UUFFSCxpREFBaUQ7UUFDakQsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLDZDQUFvQixDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDakUsTUFBTTtZQUNOLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtTQUNoQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE1Q0Qsc0NBNENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRW52aXJvbm1lbnRDb25maWcsIGFwcGx5U3RhbmRhcmRUYWdzIH0gZnJvbSAnLi4vY29uZmlnL2Vudmlyb25tZW50cyc7XG5pbXBvcnQgeyBDYXJlU3luY1ZwY0NvbnN0cnVjdCB9IGZyb20gJy4vY2FyZXN5bmMtdnBjLWNvbnN0cnVjdCc7XG5pbXBvcnQgeyBDYXJlU3luY1Jkc0NvbnN0cnVjdCB9IGZyb20gJy4vY2FyZXN5bmMtcmRzLWNvbnN0cnVjdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2FyZVN5bmNTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBjb25maWc6IEVudmlyb25tZW50Q29uZmlnO1xufVxuXG5leHBvcnQgY2xhc3MgQ2FyZVN5bmNTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSB2cGNDb25zdHJ1Y3Q6IENhcmVTeW5jVnBjQ29uc3RydWN0O1xuICBwdWJsaWMgcmVhZG9ubHkgcmRzQ29uc3RydWN0OiBDYXJlU3luY1Jkc0NvbnN0cnVjdDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ2FyZVN5bmNTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IGNvbmZpZyB9ID0gcHJvcHM7XG5cbiAgICAvLyBBcHBseSBzdGFuZGFyZCBoYWNrYXRob24gdGFncyBhY3Jvc3MgYWxsIENESyBzdGFjayByZXNvdXJjZXNcbiAgICBhcHBseVN0YW5kYXJkVGFncyh0aGlzLCBjb25maWcudGFncyk7XG5cbiAgICAvLyBDZm5PdXRwdXQgZm9yIHN0YWNrIG1ldGFkYXRhXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Byb2plY3ROYW1lJywge1xuICAgICAgdmFsdWU6IGNvbmZpZy5wcm9qZWN0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2FyZVN5bmMgUHJvamVjdCBJZGVudGlmaWVyJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEZXBsb3ltZW50RW52aXJvbm1lbnQnLCB7XG4gICAgICB2YWx1ZTogY29uZmlnLmVudmlyb25tZW50LFxuICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgRGVwbG95bWVudCBFbnZpcm9ubWVudCAoZGVtbyknLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhcmdldFJlZ2lvbicsIHtcbiAgICAgIHZhbHVlOiBjb25maWcucmVnaW9uLFxuICAgICAgZGVzY3JpcHRpb246ICdQcmltYXJ5IEFXUyBSZWdpb24gKGFwLXNvdXRoLTEpJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdNb250aGx5QnVkZ2V0QWxlcnRUYXJnZXRVU0QnLCB7XG4gICAgICB2YWx1ZTogYCQke2NvbmZpZy5tb250aGx5QnVkZ2V0VVNEfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBDb3N0IEFsZXJ0IENlaWxpbmcgKFVTRCAyMCknLFxuICAgIH0pO1xuXG4gICAgLy8gSW5zdGFudGlhdGUgUGhhc2UgMTJCIE5ldHdvcmsgJiBTdWJuZXQgQ29uc3RydWN0XG4gICAgdGhpcy52cGNDb25zdHJ1Y3QgPSBuZXcgQ2FyZVN5bmNWcGNDb25zdHJ1Y3QodGhpcywgJ1ZwY0NvbnN0cnVjdCcsIHtcbiAgICAgIGNvbmZpZyxcbiAgICB9KTtcblxuICAgIC8vIEluc3RhbnRpYXRlIFBoYXNlIDEyQyBSRFMgUG9zdGdyZVNRTCBDb25zdHJ1Y3RcbiAgICB0aGlzLnJkc0NvbnN0cnVjdCA9IG5ldyBDYXJlU3luY1Jkc0NvbnN0cnVjdCh0aGlzLCAnUmRzQ29uc3RydWN0Jywge1xuICAgICAgY29uZmlnLFxuICAgICAgdnBjQ29uc3RydWN0OiB0aGlzLnZwY0NvbnN0cnVjdCxcbiAgICB9KTtcbiAgfVxufVxuIl19