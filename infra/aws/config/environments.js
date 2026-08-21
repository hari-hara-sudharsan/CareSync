"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyStandardTags = exports.getEnvironmentConfig = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const getEnvironmentConfig = () => {
    const region = process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'ap-south-1';
    const environment = (process.env.ENVIRONMENT || 'demo');
    return {
        projectName: 'caresync',
        environment,
        region,
        monthlyBudgetUSD: 20,
        tags: {
            Project: 'CareSync',
            Environment: environment,
            Owner: 'CareSync',
            ManagedBy: 'IaC',
            Purpose: 'Hackathon',
            CostCenter: 'CareSyncDemo',
        },
    };
};
exports.getEnvironmentConfig = getEnvironmentConfig;
const applyStandardTags = (scope, tags) => {
    Object.entries(tags).forEach(([key, value]) => {
        aws_cdk_lib_1.Tags.of(scope).add(key, value);
    });
};
exports.applyStandardTags = applyStandardTags;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZW52aXJvbm1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUFtQztBQVc1QixNQUFNLG9CQUFvQixHQUFHLEdBQXNCLEVBQUU7SUFDMUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxZQUFZLENBQUM7SUFDeEYsTUFBTSxXQUFXLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxNQUFNLENBQXFDLENBQUM7SUFFNUYsT0FBTztRQUNMLFdBQVcsRUFBRSxVQUFVO1FBQ3ZCLFdBQVc7UUFDWCxNQUFNO1FBQ04sZ0JBQWdCLEVBQUUsRUFBRTtRQUNwQixJQUFJLEVBQUU7WUFDSixPQUFPLEVBQUUsVUFBVTtZQUNuQixXQUFXLEVBQUUsV0FBVztZQUN4QixLQUFLLEVBQUUsVUFBVTtZQUNqQixTQUFTLEVBQUUsS0FBSztZQUNoQixPQUFPLEVBQUUsV0FBVztZQUNwQixVQUFVLEVBQUUsY0FBYztTQUMzQjtLQUNGLENBQUM7QUFDSixDQUFDLENBQUM7QUFsQlcsUUFBQSxvQkFBb0Isd0JBa0IvQjtBQUVLLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxLQUFnQixFQUFFLElBQTRCLEVBQVEsRUFBRTtJQUN4RixNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUU7UUFDNUMsa0JBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNqQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUpXLFFBQUEsaUJBQWlCLHFCQUk1QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRhZ3MgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBFbnZpcm9ubWVudENvbmZpZyB7XG4gIHByb2plY3ROYW1lOiBzdHJpbmc7XG4gIGVudmlyb25tZW50OiAnZGVtbycgfCAnZGV2JyB8ICdzdGFnaW5nJyB8ICdwcm9kJztcbiAgcmVnaW9uOiBzdHJpbmc7XG4gIG1vbnRobHlCdWRnZXRVU0Q6IG51bWJlcjtcbiAgdGFnczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn1cblxuZXhwb3J0IGNvbnN0IGdldEVudmlyb25tZW50Q29uZmlnID0gKCk6IEVudmlyb25tZW50Q29uZmlnID0+IHtcbiAgY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfHwgJ2FwLXNvdXRoLTEnO1xuICBjb25zdCBlbnZpcm9ubWVudCA9IChwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGVtbycpIGFzIEVudmlyb25tZW50Q29uZmlnWydlbnZpcm9ubWVudCddO1xuXG4gIHJldHVybiB7XG4gICAgcHJvamVjdE5hbWU6ICdjYXJlc3luYycsXG4gICAgZW52aXJvbm1lbnQsXG4gICAgcmVnaW9uLFxuICAgIG1vbnRobHlCdWRnZXRVU0Q6IDIwLFxuICAgIHRhZ3M6IHtcbiAgICAgIFByb2plY3Q6ICdDYXJlU3luYycsXG4gICAgICBFbnZpcm9ubWVudDogZW52aXJvbm1lbnQsXG4gICAgICBPd25lcjogJ0NhcmVTeW5jJyxcbiAgICAgIE1hbmFnZWRCeTogJ0lhQycsXG4gICAgICBQdXJwb3NlOiAnSGFja2F0aG9uJyxcbiAgICAgIENvc3RDZW50ZXI6ICdDYXJlU3luY0RlbW8nLFxuICAgIH0sXG4gIH07XG59O1xuXG5leHBvcnQgY29uc3QgYXBwbHlTdGFuZGFyZFRhZ3MgPSAoc2NvcGU6IENvbnN0cnVjdCwgdGFnczogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IHZvaWQgPT4ge1xuICBPYmplY3QuZW50cmllcyh0YWdzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICBUYWdzLm9mKHNjb3BlKS5hZGQoa2V5LCB2YWx1ZSk7XG4gIH0pO1xufTtcbiJdfQ==