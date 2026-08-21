"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareSyncRdsConstruct = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const rds = require("aws-cdk-lib/aws-rds");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const constructs_1 = require("constructs");
class CareSyncRdsConstruct extends constructs_1.Construct {
    dbSecret;
    databaseInstance;
    constructor(scope, id, props) {
        super(scope, id);
        const { config, vpcConstruct } = props;
        const prefix = `${config.projectName}-${config.environment}`;
        // 1. Database Credentials in AWS Secrets Manager (Auto-generated secure password)
        this.dbSecret = new secretsmanager.Secret(this, 'RdsCredentialsSecret', {
            secretName: `${prefix}/rds-credentials`,
            description: 'CareSync RDS PostgreSQL Database Credentials',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'postgres' }),
                generateStringKey: 'password',
                excludeCharacters: '/@" \'\\',
                passwordLength: 32,
            },
        });
        // 2. Cost-conscious RDS PostgreSQL 16 Instance for Hackathon Demo
        this.databaseInstance = new rds.DatabaseInstance(this, 'DatabaseInstance', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_16_1,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
            vpc: vpcConstruct.vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
            securityGroups: [vpcConstruct.dbSecurityGroup],
            credentials: rds.Credentials.fromSecret(this.dbSecret),
            databaseName: 'caresync_db',
            allocatedStorage: 20,
            maxAllocatedStorage: 20, // Prevents automatic storage scaling costs
            storageType: rds.StorageType.GP3,
            publiclyAccessible: false, // Strict isolated private database
            storageEncrypted: true,
            backupRetention: cdk.Duration.days(7),
            deletionProtection: false, // Set to false for hackathon demo tear-down capability
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Stack cleanup policy
        });
        // CfnOutputs for RDS outputs
        new cdk.CfnOutput(this, 'RdsEndpoint', {
            value: this.databaseInstance.dbInstanceEndpointAddress,
            description: 'CareSync Private RDS PostgreSQL Endpoint Address',
        });
        new cdk.CfnOutput(this, 'RdsPort', {
            value: this.databaseInstance.dbInstanceEndpointPort,
            description: 'CareSync RDS PostgreSQL Port (5432)',
        });
        new cdk.CfnOutput(this, 'RdsSecretArn', {
            value: this.dbSecret.secretArn,
            description: 'AWS Secrets Manager Secret ARN for RDS Password',
        });
    }
}
exports.CareSyncRdsConstruct = CareSyncRdsConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZXN5bmMtcmRzLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhcmVzeW5jLXJkcy1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDJDQUEyQztBQUMzQywyQ0FBMkM7QUFDM0MsaUVBQWlFO0FBQ2pFLDJDQUF1QztBQVN2QyxNQUFhLG9CQUFxQixTQUFRLHNCQUFTO0lBQ2pDLFFBQVEsQ0FBeUI7SUFDakMsZ0JBQWdCLENBQXVCO0lBRXZELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0M7UUFDeEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLEtBQUssQ0FBQztRQUN2QyxNQUFNLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRTdELGtGQUFrRjtRQUNsRixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDdEUsVUFBVSxFQUFFLEdBQUcsTUFBTSxrQkFBa0I7WUFDdkMsV0FBVyxFQUFFLDhDQUE4QztZQUMzRCxvQkFBb0IsRUFBRTtnQkFDcEIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsQ0FBQztnQkFDOUQsaUJBQWlCLEVBQUUsVUFBVTtnQkFDN0IsaUJBQWlCLEVBQUUsVUFBVTtnQkFDN0IsY0FBYyxFQUFFLEVBQUU7YUFDbkI7U0FDRixDQUFDLENBQUM7UUFFSCxrRUFBa0U7UUFDbEUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUN6RSxNQUFNLEVBQUUsR0FBRyxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztnQkFDMUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRO2FBQzVDLENBQUM7WUFDRixZQUFZLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQy9CLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUNyQixHQUFHLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FDdkI7WUFDRCxHQUFHLEVBQUUsWUFBWSxDQUFDLEdBQUc7WUFDckIsVUFBVSxFQUFFO2dCQUNWLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjthQUM1QztZQUNELGNBQWMsRUFBRSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUM7WUFDOUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDdEQsWUFBWSxFQUFFLGFBQWE7WUFDM0IsZ0JBQWdCLEVBQUUsRUFBRTtZQUNwQixtQkFBbUIsRUFBRSxFQUFFLEVBQUUsMkNBQTJDO1lBQ3BFLFdBQVcsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUc7WUFDaEMsa0JBQWtCLEVBQUUsS0FBSyxFQUFFLG1DQUFtQztZQUM5RCxnQkFBZ0IsRUFBRSxJQUFJO1lBQ3RCLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDckMsa0JBQWtCLEVBQUUsS0FBSyxFQUFFLHVEQUF1RDtZQUNsRixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsdUJBQXVCO1NBQ2xFLENBQUMsQ0FBQztRQUVILDZCQUE2QjtRQUM3QixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QjtZQUN0RCxXQUFXLEVBQUUsa0RBQWtEO1NBQ2hFLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO1lBQ2pDLEtBQUssRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCO1lBQ25ELFdBQVcsRUFBRSxxQ0FBcUM7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDdEMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUztZQUM5QixXQUFXLEVBQUUsaURBQWlEO1NBQy9ELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWhFRCxvREFnRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgcmRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yZHMnO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRW52aXJvbm1lbnRDb25maWcgfSBmcm9tICcuLi9jb25maWcvZW52aXJvbm1lbnRzJztcbmltcG9ydCB7IENhcmVTeW5jVnBjQ29uc3RydWN0IH0gZnJvbSAnLi9jYXJlc3luYy12cGMtY29uc3RydWN0JztcblxuZXhwb3J0IGludGVyZmFjZSBDYXJlU3luY1Jkc0NvbnN0cnVjdFByb3BzIHtcbiAgY29uZmlnOiBFbnZpcm9ubWVudENvbmZpZztcbiAgdnBjQ29uc3RydWN0OiBDYXJlU3luY1ZwY0NvbnN0cnVjdDtcbn1cblxuZXhwb3J0IGNsYXNzIENhcmVTeW5jUmRzQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGRiU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5JU2VjcmV0O1xuICBwdWJsaWMgcmVhZG9ubHkgZGF0YWJhc2VJbnN0YW5jZTogcmRzLkRhdGFiYXNlSW5zdGFuY2U7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENhcmVTeW5jUmRzQ29uc3RydWN0UHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgeyBjb25maWcsIHZwY0NvbnN0cnVjdCB9ID0gcHJvcHM7XG4gICAgY29uc3QgcHJlZml4ID0gYCR7Y29uZmlnLnByb2plY3ROYW1lfS0ke2NvbmZpZy5lbnZpcm9ubWVudH1gO1xuXG4gICAgLy8gMS4gRGF0YWJhc2UgQ3JlZGVudGlhbHMgaW4gQVdTIFNlY3JldHMgTWFuYWdlciAoQXV0by1nZW5lcmF0ZWQgc2VjdXJlIHBhc3N3b3JkKVxuICAgIHRoaXMuZGJTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdSZHNDcmVkZW50aWFsc1NlY3JldCcsIHtcbiAgICAgIHNlY3JldE5hbWU6IGAke3ByZWZpeH0vcmRzLWNyZWRlbnRpYWxzYCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2FyZVN5bmMgUkRTIFBvc3RncmVTUUwgRGF0YWJhc2UgQ3JlZGVudGlhbHMnLFxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcbiAgICAgICAgc2VjcmV0U3RyaW5nVGVtcGxhdGU6IEpTT04uc3RyaW5naWZ5KHsgdXNlcm5hbWU6ICdwb3N0Z3JlcycgfSksXG4gICAgICAgIGdlbmVyYXRlU3RyaW5nS2V5OiAncGFzc3dvcmQnLFxuICAgICAgICBleGNsdWRlQ2hhcmFjdGVyczogJy9AXCIgXFwnXFxcXCcsXG4gICAgICAgIHBhc3N3b3JkTGVuZ3RoOiAzMixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyAyLiBDb3N0LWNvbnNjaW91cyBSRFMgUG9zdGdyZVNRTCAxNiBJbnN0YW5jZSBmb3IgSGFja2F0aG9uIERlbW9cbiAgICB0aGlzLmRhdGFiYXNlSW5zdGFuY2UgPSBuZXcgcmRzLkRhdGFiYXNlSW5zdGFuY2UodGhpcywgJ0RhdGFiYXNlSW5zdGFuY2UnLCB7XG4gICAgICBlbmdpbmU6IHJkcy5EYXRhYmFzZUluc3RhbmNlRW5naW5lLnBvc3RncmVzKHtcbiAgICAgICAgdmVyc2lvbjogcmRzLlBvc3RncmVzRW5naW5lVmVyc2lvbi5WRVJfMTZfMSxcbiAgICAgIH0pLFxuICAgICAgaW5zdGFuY2VUeXBlOiBlYzIuSW5zdGFuY2VUeXBlLm9mKFxuICAgICAgICBlYzIuSW5zdGFuY2VDbGFzcy5UNEcsXG4gICAgICAgIGVjMi5JbnN0YW5jZVNpemUuTUlDUk9cbiAgICAgICksXG4gICAgICB2cGM6IHZwY0NvbnN0cnVjdC52cGMsXG4gICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXG4gICAgICB9LFxuICAgICAgc2VjdXJpdHlHcm91cHM6IFt2cGNDb25zdHJ1Y3QuZGJTZWN1cml0eUdyb3VwXSxcbiAgICAgIGNyZWRlbnRpYWxzOiByZHMuQ3JlZGVudGlhbHMuZnJvbVNlY3JldCh0aGlzLmRiU2VjcmV0KSxcbiAgICAgIGRhdGFiYXNlTmFtZTogJ2NhcmVzeW5jX2RiJyxcbiAgICAgIGFsbG9jYXRlZFN0b3JhZ2U6IDIwLFxuICAgICAgbWF4QWxsb2NhdGVkU3RvcmFnZTogMjAsIC8vIFByZXZlbnRzIGF1dG9tYXRpYyBzdG9yYWdlIHNjYWxpbmcgY29zdHNcbiAgICAgIHN0b3JhZ2VUeXBlOiByZHMuU3RvcmFnZVR5cGUuR1AzLFxuICAgICAgcHVibGljbHlBY2Nlc3NpYmxlOiBmYWxzZSwgLy8gU3RyaWN0IGlzb2xhdGVkIHByaXZhdGUgZGF0YWJhc2VcbiAgICAgIHN0b3JhZ2VFbmNyeXB0ZWQ6IHRydWUsXG4gICAgICBiYWNrdXBSZXRlbnRpb246IGNkay5EdXJhdGlvbi5kYXlzKDcpLFxuICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiBmYWxzZSwgLy8gU2V0IHRvIGZhbHNlIGZvciBoYWNrYXRob24gZGVtbyB0ZWFyLWRvd24gY2FwYWJpbGl0eVxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gU3RhY2sgY2xlYW51cCBwb2xpY3lcbiAgICB9KTtcblxuICAgIC8vIENmbk91dHB1dHMgZm9yIFJEUyBvdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Jkc0VuZHBvaW50Jywge1xuICAgICAgdmFsdWU6IHRoaXMuZGF0YWJhc2VJbnN0YW5jZS5kYkluc3RhbmNlRW5kcG9pbnRBZGRyZXNzLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBQcml2YXRlIFJEUyBQb3N0Z3JlU1FMIEVuZHBvaW50IEFkZHJlc3MnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Jkc1BvcnQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5kYXRhYmFzZUluc3RhbmNlLmRiSW5zdGFuY2VFbmRwb2ludFBvcnQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NhcmVTeW5jIFJEUyBQb3N0Z3JlU1FMIFBvcnQgKDU0MzIpJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZHNTZWNyZXRBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5kYlNlY3JldC5zZWNyZXRBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FXUyBTZWNyZXRzIE1hbmFnZXIgU2VjcmV0IEFSTiBmb3IgUkRTIFBhc3N3b3JkJyxcbiAgICB9KTtcbiAgfVxufVxuIl19