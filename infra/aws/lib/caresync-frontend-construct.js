"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareSyncFrontendConstruct = void 0;
const cdk = require("aws-cdk-lib");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const s3 = require("aws-cdk-lib/aws-s3");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
const path = require("path");
const constructs_1 = require("constructs");
class CareSyncFrontendConstruct extends constructs_1.Construct {
    bucket;
    distribution;
    constructor(scope, id, props) {
        super(scope, id);
        const { config, ecsConstruct } = props;
        const prefix = `${config.projectName}-${config.environment}`;
        // 1. Private S3 Bucket for Frontend Static Web Assets (Strict Non-Public Access)
        this.bucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `${prefix}-frontend-bucket`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Fully private, no direct public internet access
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true, // Cost-conscious cleanup for demo environment
        });
        // 2. CloudFront Origins: S3 (OAC Private Access) & ALB (HTTP Origin for /api/*)
        const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(this.bucket);
        const albOrigin = new origins.HttpOrigin(ecsConstruct.alb.loadBalancerDnsName, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            httpPort: 80,
        });
        // 3. CloudFront Global Distribution
        this.distribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', {
            comment: `CareSync ${config.environment} CloudFront CDN Distribution`,
            defaultRootObject: 'index.html',
            // Default Behavior (Static React SPA Assets routed to private S3 Bucket)
            defaultBehavior: {
                origin: s3Origin,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                compress: true,
            },
            // Additional Behavior: /api/* routed to Application Load Balancer
            additionalBehaviors: {
                '/api/*': {
                    origin: albOrigin,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // Dynamic API responses, no CDN caching
                    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                },
            },
            // Client-Side Routing SPA Fallbacks (Redirect 403/404 to /index.html with Status 200)
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.seconds(0),
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.seconds(0),
                },
            ],
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Cost-conscious US/Europe/Asia edge locations
        });
        // 4. S3 Bucket Asset Deployment (Uploads frontend/dist build artifacts)
        const frontendDistPath = path.join(__dirname, '../../../frontend/dist');
        new s3deploy.BucketDeployment(this, 'DeployFrontendAssets', {
            sources: [s3deploy.Source.asset(frontendDistPath)],
            destinationBucket: this.bucket,
            distribution: this.distribution,
            distributionPaths: ['/*'], // Invalidate CloudFront CDN cache on redeploy
        });
        // Output CloudFront Details
        new cdk.CfnOutput(this, 'FrontendBucketName', {
            value: this.bucket.bucketName,
            description: 'CareSync Private S3 Bucket Name for Static Frontend Assets',
        });
        new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
            value: this.distribution.distributionId,
            description: 'CareSync CloudFront Distribution ID',
        });
        new cdk.CfnOutput(this, 'CloudFrontDomainName', {
            value: this.distribution.distributionDomainName,
            description: 'CareSync CloudFront Distribution Domain Name',
        });
        new cdk.CfnOutput(this, 'CloudFrontUrl', {
            value: `https://${this.distribution.distributionDomainName}`,
            description: 'CareSync Public CloudFront HTTPS URL',
        });
    }
}
exports.CareSyncFrontendConstruct = CareSyncFrontendConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZXN5bmMtZnJvbnRlbmQtY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2FyZXN5bmMtZnJvbnRlbmQtY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyx5REFBeUQ7QUFDekQsOERBQThEO0FBQzlELHlDQUF5QztBQUN6QywwREFBMEQ7QUFDMUQsNkJBQTZCO0FBQzdCLDJDQUF1QztBQVN2QyxNQUFhLHlCQUEwQixTQUFRLHNCQUFTO0lBQ3RDLE1BQU0sQ0FBWTtJQUNsQixZQUFZLENBQTBCO0lBRXRELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBcUM7UUFDN0UsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLEtBQUssQ0FBQztRQUN2QyxNQUFNLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRTdELGlGQUFpRjtRQUNqRixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDbEQsVUFBVSxFQUFFLEdBQUcsTUFBTSxrQkFBa0I7WUFDdkMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxrREFBa0Q7WUFDckcsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1lBQzFDLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLDhDQUE4QztTQUN4RSxDQUFDLENBQUM7UUFFSCxnRkFBZ0Y7UUFDaEYsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMs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QUFXLEVBQUUscUNBQXFDO1NBQ25ELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDOUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsc0JBQXNCO1lBQy9DLFdBQVcsRUFBRSw4Q0FBOEM7U0FDNUQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDdkMsS0FBSyxFQUFFLFdBQVcsSUFBSSxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsRUFBRTtZQUM1RCxXQUFXLEVBQUUsc0NBQXNDO1NBQ3BELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXBHRCw4REFvR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIHMzZGVwbG95IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1kZXBsb3ltZW50JztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVudmlyb25tZW50Q29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL2Vudmlyb25tZW50cyc7XG5pbXBvcnQgeyBDYXJlU3luY0Vjc0NvbnN0cnVjdCB9IGZyb20gJy4vY2FyZXN5bmMtZWNzLWNvbnN0cnVjdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2FyZVN5bmNGcm9udGVuZENvbnN0cnVjdFByb3BzIHtcbiAgY29uZmlnOiBFbnZpcm9ubWVudENvbmZpZztcbiAgZWNzQ29uc3RydWN0OiBDYXJlU3luY0Vjc0NvbnN0cnVjdDtcbn1cblxuZXhwb3J0IGNsYXNzIENhcmVTeW5jRnJvbnRlbmRDb25zdHJ1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgYnVja2V0OiBzMy5CdWNrZXQ7XG4gIHB1YmxpYyByZWFkb25seSBkaXN0cmlidXRpb246IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDYXJlU3luY0Zyb250ZW5kQ29uc3RydWN0UHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgeyBjb25maWcsIGVjc0NvbnN0cnVjdCB9ID0gcHJvcHM7XG4gICAgY29uc3QgcHJlZml4ID0gYCR7Y29uZmlnLnByb2plY3ROYW1lfS0ke2NvbmZpZy5lbnZpcm9ubWVudH1gO1xuXG4gICAgLy8gMS4gUHJpdmF0ZSBTMyBCdWNrZXQgZm9yIEZyb250ZW5kIFN0YXRpYyBXZWIgQXNzZXRzIChTdHJpY3QgTm9uLVB1YmxpYyBBY2Nlc3MpXG4gICAgdGhpcy5idWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdGcm9udGVuZEJ1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGAke3ByZWZpeH0tZnJvbnRlbmQtYnVja2V0YCxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsIC8vIEZ1bGx5IHByaXZhdGUsIG5vIGRpcmVjdCBwdWJsaWMgaW50ZXJuZXQgYWNjZXNzXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLCAvLyBDb3N0LWNvbnNjaW91cyBjbGVhbnVwIGZvciBkZW1vIGVudmlyb25tZW50XG4gICAgfSk7XG5cbiAgICAvLyAyLiBDbG91ZEZyb250IE9yaWdpbnM6IFMzIChPQUMgUHJpdmF0ZSBBY2Nlc3MpICYgQUxCIChIVFRQIE9yaWdpbiBmb3IgL2FwaS8qKVxuICAgIGNvbnN0IHMzT3JpZ2luID0gb3JpZ2lucy5TM0J1Y2tldE9yaWdpbi53aXRoT3JpZ2luQWNjZXNzQ29udHJvbCh0aGlzLmJ1Y2tldCk7XG5cbiAgICBjb25zdCBhbGJPcmlnaW4gPSBuZXcgb3JpZ2lucy5IdHRwT3JpZ2luKGVjc0NvbnN0cnVjdC5hbGIubG9hZEJhbGFuY2VyRG5zTmFtZSwge1xuICAgICAgcHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUHJvdG9jb2xQb2xpY3kuSFRUUF9PTkxZLFxuICAgICAgaHR0cFBvcnQ6IDgwLFxuICAgIH0pO1xuXG4gICAgLy8gMy4gQ2xvdWRGcm9udCBHbG9iYWwgRGlzdHJpYnV0aW9uXG4gICAgdGhpcy5kaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Nsb3VkRnJvbnREaXN0cmlidXRpb24nLCB7XG4gICAgICBjb21tZW50OiBgQ2FyZVN5bmMgJHtjb25maWcuZW52aXJvbm1lbnR9IENsb3VkRnJvbnQgQ0ROIERpc3RyaWJ1dGlvbmAsXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxuICAgICAgLy8gRGVmYXVsdCBCZWhhdmlvciAoU3RhdGljIFJlYWN0IFNQQSBBc3NldHMgcm91dGVkIHRvIHByaXZhdGUgUzMgQnVja2V0KVxuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIG9yaWdpbjogczNPcmlnaW4sXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRCxcbiAgICAgICAgY2FjaGVkTWV0aG9kczogY2xvdWRmcm9udC5DYWNoZWRNZXRob2RzLkNBQ0hFX0dFVF9IRUFELFxuICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgICAgY29tcHJlc3M6IHRydWUsXG4gICAgICB9LFxuICAgICAgLy8gQWRkaXRpb25hbCBCZWhhdmlvcjogL2FwaS8qIHJvdXRlZCB0byBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyXG4gICAgICBhZGRpdGlvbmFsQmVoYXZpb3JzOiB7XG4gICAgICAgICcvYXBpLyonOiB7XG4gICAgICAgICAgb3JpZ2luOiBhbGJPcmlnaW4sXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuQUxMT1dfQUxMLFxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0FMTCxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELCAvLyBEeW5hbWljIEFQSSByZXNwb25zZXMsIG5vIENETiBjYWNoaW5nXG4gICAgICAgICAgb3JpZ2luUmVxdWVzdFBvbGljeTogY2xvdWRmcm9udC5PcmlnaW5SZXF1ZXN0UG9saWN5LkFMTF9WSUVXRVJfRVhDRVBUX0hPU1RfSEVBREVSLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIC8vIENsaWVudC1TaWRlIFJvdXRpbmcgU1BBIEZhbGxiYWNrcyAoUmVkaXJlY3QgNDAzLzQwNCB0byAvaW5kZXguaHRtbCB3aXRoIFN0YXR1cyAyMDApXG4gICAgICBlcnJvclJlc3BvbnNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcHJpY2VDbGFzczogY2xvdWRmcm9udC5QcmljZUNsYXNzLlBSSUNFX0NMQVNTXzEwMCwgLy8gQ29zdC1jb25zY2lvdXMgVVMvRXVyb3BlL0FzaWEgZWRnZSBsb2NhdGlvbnNcbiAgICB9KTtcblxuICAgIC8vIDQuIFMzIEJ1Y2tldCBBc3NldCBEZXBsb3ltZW50IChVcGxvYWRzIGZyb250ZW5kL2Rpc3QgYnVpbGQgYXJ0aWZhY3RzKVxuICAgIGNvbnN0IGZyb250ZW5kRGlzdFBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vZnJvbnRlbmQvZGlzdCcpO1xuXG4gICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgJ0RlcGxveUZyb250ZW5kQXNzZXRzJywge1xuICAgICAgc291cmNlczogW3MzZGVwbG95LlNvdXJjZS5hc3NldChmcm9udGVuZERpc3RQYXRoKV0sXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogdGhpcy5idWNrZXQsXG4gICAgICBkaXN0cmlidXRpb246IHRoaXMuZGlzdHJpYnV0aW9uLFxuICAgICAgZGlzdHJpYnV0aW9uUGF0aHM6IFsnLyonXSwgLy8gSW52YWxpZGF0ZSBDbG91ZEZyb250IENETiBjYWNoZSBvbiByZWRlcGxveVxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IENsb3VkRnJvbnQgRGV0YWlsc1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGcm9udGVuZEJ1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5idWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2FyZVN5bmMgUHJpdmF0ZSBTMyBCdWNrZXQgTmFtZSBmb3IgU3RhdGljIEZyb250ZW5kIEFzc2V0cycsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERpc3RyaWJ1dGlvbklkJywge1xuICAgICAgdmFsdWU6IHRoaXMuZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBDbG91ZEZyb250IERpc3RyaWJ1dGlvbiBJRCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERvbWFpbk5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2FyZVN5bmMgQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gRG9tYWluIE5hbWUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Nsb3VkRnJvbnRVcmwnLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHt0aGlzLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NhcmVTeW5jIFB1YmxpYyBDbG91ZEZyb250IEhUVFBTIFVSTCcsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==