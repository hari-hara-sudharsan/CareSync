"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareSyncStack = void 0;
const cdk = require("aws-cdk-lib");
const environments_1 = require("../config/environments");
class CareSyncStack extends cdk.Stack {
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
        /*
         * PHASE 12A ARCHITECTURAL GUARDRAIL NOTICE:
         *
         * In Phase 12A, NO runtime application resources (VPC, RDS PostgreSQL,
         * ElastiCache Redis, ECS Cluster, ALB, NAT Gateway, Bedrock workloads)
         * are created.
         *
         * Infrastructure resources will be provisioned in subsequent approved sub-phases:
         * - Phase 12B: VPC & Networking (VPC without NAT Gateway)
         * - Phase 12C: PostgreSQL Persistence (RDS / Containerized DB)
         * - Phase 12D: Redis Transport & Background Worker
         * - Phase 12E: FastAPI Application & Frontend Container Deployment
         */
    }
}
exports.CareSyncStack = CareSyncStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZXN5bmMtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjYXJlc3luYy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFFbkMseURBQThFO0FBTTlFLE1BQWEsYUFBYyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzFDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBeUI7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQztRQUV6QiwrREFBK0Q7UUFDL0QsSUFBQSxnQ0FBaUIsRUFBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXJDLCtCQUErQjtRQUMvQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsTUFBTSxDQUFDLFdBQVc7WUFDekIsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQy9DLEtBQUssRUFBRSxNQUFNLENBQUMsV0FBVztZQUN6QixXQUFXLEVBQUUsc0NBQXNDO1NBQ3BELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RDLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTTtZQUNwQixXQUFXLEVBQUUsaUNBQWlDO1NBQy9DLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDckQsS0FBSyxFQUFFLElBQUksTUFBTSxDQUFDLGdCQUFnQixFQUFFO1lBQ3BDLFdBQVcsRUFBRSxvQ0FBb0M7U0FDbEQsQ0FBQyxDQUFDO1FBRUg7Ozs7Ozs7Ozs7OztXQVlHO0lBQ0wsQ0FBQztDQUNGO0FBNUNELHNDQTRDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVudmlyb25tZW50Q29uZmlnLCBhcHBseVN0YW5kYXJkVGFncyB9IGZyb20gJy4uL2NvbmZpZy9lbnZpcm9ubWVudHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIENhcmVTeW5jU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgY29uZmlnOiBFbnZpcm9ubWVudENvbmZpZztcbn1cblxuZXhwb3J0IGNsYXNzIENhcmVTeW5jU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ2FyZVN5bmNTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IGNvbmZpZyB9ID0gcHJvcHM7XG5cbiAgICAvLyBBcHBseSBzdGFuZGFyZCBoYWNrYXRob24gdGFncyBhY3Jvc3MgYWxsIENESyBzdGFjayByZXNvdXJjZXNcbiAgICBhcHBseVN0YW5kYXJkVGFncyh0aGlzLCBjb25maWcudGFncyk7XG5cbiAgICAvLyBDZm5PdXRwdXQgZm9yIHN0YWNrIG1ldGFkYXRhXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Byb2plY3ROYW1lJywge1xuICAgICAgdmFsdWU6IGNvbmZpZy5wcm9qZWN0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2FyZVN5bmMgUHJvamVjdCBJZGVudGlmaWVyJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEZXBsb3ltZW50RW52aXJvbm1lbnQnLCB7XG4gICAgICB2YWx1ZTogY29uZmlnLmVudmlyb25tZW50LFxuICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgRGVwbG95bWVudCBFbnZpcm9ubWVudCAoZGVtbyknLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhcmdldFJlZ2lvbicsIHtcbiAgICAgIHZhbHVlOiBjb25maWcucmVnaW9uLFxuICAgICAgZGVzY3JpcHRpb246ICdQcmltYXJ5IEFXUyBSZWdpb24gKGFwLXNvdXRoLTEpJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdNb250aGx5QnVkZ2V0QWxlcnRUYXJnZXRVU0QnLCB7XG4gICAgICB2YWx1ZTogYCQke2NvbmZpZy5tb250aGx5QnVkZ2V0VVNEfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBDb3N0IEFsZXJ0IENlaWxpbmcgKFVTRCAyMCknLFxuICAgIH0pO1xuXG4gICAgLypcbiAgICAgKiBQSEFTRSAxMkEgQVJDSElURUNUVVJBTCBHVUFSRFJBSUwgTk9USUNFOlxuICAgICAqIFxuICAgICAqIEluIFBoYXNlIDEyQSwgTk8gcnVudGltZSBhcHBsaWNhdGlvbiByZXNvdXJjZXMgKFZQQywgUkRTIFBvc3RncmVTUUwsXG4gICAgICogRWxhc3RpQ2FjaGUgUmVkaXMsIEVDUyBDbHVzdGVyLCBBTEIsIE5BVCBHYXRld2F5LCBCZWRyb2NrIHdvcmtsb2FkcylcbiAgICAgKiBhcmUgY3JlYXRlZC5cbiAgICAgKiBcbiAgICAgKiBJbmZyYXN0cnVjdHVyZSByZXNvdXJjZXMgd2lsbCBiZSBwcm92aXNpb25lZCBpbiBzdWJzZXF1ZW50IGFwcHJvdmVkIHN1Yi1waGFzZXM6XG4gICAgICogLSBQaGFzZSAxMkI6IFZQQyAmIE5ldHdvcmtpbmcgKFZQQyB3aXRob3V0IE5BVCBHYXRld2F5KVxuICAgICAqIC0gUGhhc2UgMTJDOiBQb3N0Z3JlU1FMIFBlcnNpc3RlbmNlIChSRFMgLyBDb250YWluZXJpemVkIERCKVxuICAgICAqIC0gUGhhc2UgMTJEOiBSZWRpcyBUcmFuc3BvcnQgJiBCYWNrZ3JvdW5kIFdvcmtlclxuICAgICAqIC0gUGhhc2UgMTJFOiBGYXN0QVBJIEFwcGxpY2F0aW9uICYgRnJvbnRlbmQgQ29udGFpbmVyIERlcGxveW1lbnRcbiAgICAgKi9cbiAgfVxufVxuIl19