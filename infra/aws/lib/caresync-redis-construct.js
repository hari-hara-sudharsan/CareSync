"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareSyncRedisConstruct = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const elasticache = require("aws-cdk-lib/aws-elasticache");
const constructs_1 = require("constructs");
class CareSyncRedisConstruct extends constructs_1.Construct {
    subnetGroup;
    redisCluster;
    constructor(scope, id, props) {
        super(scope, id);
        const { config, vpcConstruct } = props;
        const prefix = `${config.projectName}-${config.environment}`;
        // 1. ElastiCache Subnet Group (Private Isolated Subnets)
        const isolatedSubnetIds = vpcConstruct.vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }).subnetIds;
        this.subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
            cacheSubnetGroupName: `${prefix}-redis-subnet-group`,
            description: 'CareSync ElastiCache Redis Subnet Group - Isolated Private Subnets',
            subnetIds: isolatedSubnetIds,
        });
        // 2. Cost-conscious Single-Node ElastiCache Redis Cluster for Transient Event Transport
        this.redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
            clusterName: `${prefix}-redis`,
            engine: 'redis',
            cacheNodeType: 'cache.t4g.micro', // Cost-conscious ARM cache instance
            numCacheNodes: 1, // Single node (Non-clustered) for hackathon demo cost control
            cacheSubnetGroupName: this.subnetGroup.cacheSubnetGroupName,
            vpcSecurityGroupIds: [vpcConstruct.redisSecurityGroup.securityGroupId],
            port: 6379,
            autoMinorVersionUpgrade: true,
        });
        this.redisCluster.addDependency(this.subnetGroup);
        // CfnOutputs for Redis Cluster Configuration
        new cdk.CfnOutput(this, 'RedisEndpoint', {
            value: this.redisCluster.attrRedisEndpointAddress,
            description: 'CareSync Private ElastiCache Redis Endpoint Address',
        });
        new cdk.CfnOutput(this, 'RedisPort', {
            value: this.redisCluster.attrRedisEndpointPort,
            description: 'CareSync ElastiCache Redis Port (6379)',
        });
    }
}
exports.CareSyncRedisConstruct = CareSyncRedisConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZXN5bmMtcmVkaXMtY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2FyZXN5bmMtcmVkaXMtY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQywyQ0FBMkM7QUFDM0MsMkRBQTJEO0FBQzNELDJDQUF1QztBQVN2QyxNQUFhLHNCQUF1QixTQUFRLHNCQUFTO0lBQ25DLFdBQVcsQ0FBNkI7SUFDeEMsWUFBWSxDQUE4QjtJQUUxRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWtDO1FBQzFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDdkMsTUFBTSxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsV0FBVyxJQUFJLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUU3RCx5REFBeUQ7UUFDekQsTUFBTSxpQkFBaUIsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQztZQUN2RCxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0I7U0FDNUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUViLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxRSxvQkFBb0IsRUFBRSxHQUFHLE1BQU0scUJBQXFCO1lBQ3BELFdBQVcsRUFBRSxvRUFBb0U7WUFDakYsU0FBUyxFQUFFLGlCQUFpQjtTQUM3QixDQUFDLENBQUM7UUFFSCx3RkFBd0Y7UUFDeEYsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN4RSxXQUFXLEVBQUUsR0FBRyxNQUFNLFFBQVE7WUFDOUIsTUFBTSxFQUFFLE9BQU87WUFDZixhQUFhLEVBQUUsaUJBQWlCLEVBQUUsb0NBQW9DO1lBQ3RFLGFBQWEsRUFBRSxDQUFDLEVBQUUsOERBQThEO1lBQ2hGLG9CQUFvQixFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsb0JBQW9CO1lBQzNELG1CQUFtQixFQUFFLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQztZQUN0RSxJQUFJLEVBQUUsSUFBSTtZQUNWLHVCQUF1QixFQUFFLElBQUk7U0FDOUIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRWxELDZDQUE2QztRQUM3QyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyx3QkFBd0I7WUFDakQsV0FBVyxFQUFFLHFEQUFxRDtTQUNuRSxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUNuQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxxQkFBcUI7WUFDOUMsV0FBVyxFQUFFLHdDQUF3QztTQUN0RCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE5Q0Qsd0RBOENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGVsYXN0aWNhY2hlIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lbGFzdGljYWNoZSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVudmlyb25tZW50Q29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL2Vudmlyb25tZW50cyc7XG5pbXBvcnQgeyBDYXJlU3luY1ZwY0NvbnN0cnVjdCB9IGZyb20gJy4vY2FyZXN5bmMtdnBjLWNvbnN0cnVjdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2FyZVN5bmNSZWRpc0NvbnN0cnVjdFByb3BzIHtcbiAgY29uZmlnOiBFbnZpcm9ubWVudENvbmZpZztcbiAgdnBjQ29uc3RydWN0OiBDYXJlU3luY1ZwY0NvbnN0cnVjdDtcbn1cblxuZXhwb3J0IGNsYXNzIENhcmVTeW5jUmVkaXNDb25zdHJ1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgc3VibmV0R3JvdXA6IGVsYXN0aWNhY2hlLkNmblN1Ym5ldEdyb3VwO1xuICBwdWJsaWMgcmVhZG9ubHkgcmVkaXNDbHVzdGVyOiBlbGFzdGljYWNoZS5DZm5DYWNoZUNsdXN0ZXI7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENhcmVTeW5jUmVkaXNDb25zdHJ1Y3RQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB7IGNvbmZpZywgdnBjQ29uc3RydWN0IH0gPSBwcm9wcztcbiAgICBjb25zdCBwcmVmaXggPSBgJHtjb25maWcucHJvamVjdE5hbWV9LSR7Y29uZmlnLmVudmlyb25tZW50fWA7XG5cbiAgICAvLyAxLiBFbGFzdGlDYWNoZSBTdWJuZXQgR3JvdXAgKFByaXZhdGUgSXNvbGF0ZWQgU3VibmV0cylcbiAgICBjb25zdCBpc29sYXRlZFN1Ym5ldElkcyA9IHZwY0NvbnN0cnVjdC52cGMuc2VsZWN0U3VibmV0cyh7XG4gICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxuICAgIH0pLnN1Ym5ldElkcztcblxuICAgIHRoaXMuc3VibmV0R3JvdXAgPSBuZXcgZWxhc3RpY2FjaGUuQ2ZuU3VibmV0R3JvdXAodGhpcywgJ1JlZGlzU3VibmV0R3JvdXAnLCB7XG4gICAgICBjYWNoZVN1Ym5ldEdyb3VwTmFtZTogYCR7cHJlZml4fS1yZWRpcy1zdWJuZXQtZ3JvdXBgLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBFbGFzdGlDYWNoZSBSZWRpcyBTdWJuZXQgR3JvdXAgLSBJc29sYXRlZCBQcml2YXRlIFN1Ym5ldHMnLFxuICAgICAgc3VibmV0SWRzOiBpc29sYXRlZFN1Ym5ldElkcyxcbiAgICB9KTtcblxuICAgIC8vIDIuIENvc3QtY29uc2Npb3VzIFNpbmdsZS1Ob2RlIEVsYXN0aUNhY2hlIFJlZGlzIENsdXN0ZXIgZm9yIFRyYW5zaWVudCBFdmVudCBUcmFuc3BvcnRcbiAgICB0aGlzLnJlZGlzQ2x1c3RlciA9IG5ldyBlbGFzdGljYWNoZS5DZm5DYWNoZUNsdXN0ZXIodGhpcywgJ1JlZGlzQ2x1c3RlcicsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOiBgJHtwcmVmaXh9LXJlZGlzYCxcbiAgICAgIGVuZ2luZTogJ3JlZGlzJyxcbiAgICAgIGNhY2hlTm9kZVR5cGU6ICdjYWNoZS50NGcubWljcm8nLCAvLyBDb3N0LWNvbnNjaW91cyBBUk0gY2FjaGUgaW5zdGFuY2VcbiAgICAgIG51bUNhY2hlTm9kZXM6IDEsIC8vIFNpbmdsZSBub2RlIChOb24tY2x1c3RlcmVkKSBmb3IgaGFja2F0aG9uIGRlbW8gY29zdCBjb250cm9sXG4gICAgICBjYWNoZVN1Ym5ldEdyb3VwTmFtZTogdGhpcy5zdWJuZXRHcm91cC5jYWNoZVN1Ym5ldEdyb3VwTmFtZSxcbiAgICAgIHZwY1NlY3VyaXR5R3JvdXBJZHM6IFt2cGNDb25zdHJ1Y3QucmVkaXNTZWN1cml0eUdyb3VwLnNlY3VyaXR5R3JvdXBJZF0sXG4gICAgICBwb3J0OiA2Mzc5LFxuICAgICAgYXV0b01pbm9yVmVyc2lvblVwZ3JhZGU6IHRydWUsXG4gICAgfSk7XG5cbiAgICB0aGlzLnJlZGlzQ2x1c3Rlci5hZGREZXBlbmRlbmN5KHRoaXMuc3VibmV0R3JvdXApO1xuXG4gICAgLy8gQ2ZuT3V0cHV0cyBmb3IgUmVkaXMgQ2x1c3RlciBDb25maWd1cmF0aW9uXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1JlZGlzRW5kcG9pbnQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5yZWRpc0NsdXN0ZXIuYXR0clJlZGlzRW5kcG9pbnRBZGRyZXNzLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBQcml2YXRlIEVsYXN0aUNhY2hlIFJlZGlzIEVuZHBvaW50IEFkZHJlc3MnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1JlZGlzUG9ydCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnJlZGlzQ2x1c3Rlci5hdHRyUmVkaXNFbmRwb2ludFBvcnQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NhcmVTeW5jIEVsYXN0aUNhY2hlIFJlZGlzIFBvcnQgKDYzNzkpJyxcbiAgICB9KTtcbiAgfVxufVxuIl19