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
    responseHeadersPolicy;
    constructor(scope, id, props) {
        super(scope, id);
        const { config, ecsConstruct, useHttpsAlbOrigin = false } = props;
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
        // 2. Security Response Headers Policy (HSTS, No-Sniff, Frame Options, Referrer Policy)
        this.responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
            responseHeadersPolicyName: `${prefix}-security-headers`,
            securityHeadersBehavior: {
                strictTransportSecurity: {
                    accessControlMaxAge: cdk.Duration.seconds(31536000),
                    includeSubdomains: true,
                    override: true,
                    preload: true,
                },
                contentTypeOptions: { override: true },
                referrerPolicy: {
                    referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
                    override: true,
                },
                frameOptions: {
                    frameOption: cloudfront.HeadersFrameOption.DENY,
                    override: true,
                },
            },
        });
        // 3. CloudFront Origins: Private S3 (OAC Access) & Application Load Balancer
        const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(this.bucket);
        const albOrigin = new origins.HttpOrigin(ecsConstruct.alb.loadBalancerDnsName, {
            protocolPolicy: useHttpsAlbOrigin
                ? cloudfront.OriginProtocolPolicy.HTTPS_ONLY
                : cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            httpPort: 80,
            httpsPort: 443,
        });
        // 4. API Cache Policy (Disables caching while allowing Authorization Bearer tokens in Cache Key)
        const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
            cachePolicyName: `${prefix}-api-no-cache`,
            comment: 'Disables caching for dynamic API responses while preserving Authorization header',
            defaultTtl: cdk.Duration.seconds(0),
            minTtl: cdk.Duration.seconds(0),
            maxTtl: cdk.Duration.seconds(1),
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Authorization', 'Idempotency-Key', 'X-Admin-API-Key'),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        });
        // 5. CloudFront Global Distribution with HTTPS Enforcement & Same-Origin API Proxy
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
                responseHeadersPolicy: this.responseHeadersPolicy,
                compress: true,
            },
            // Additional Behavior: /api/* routed to Application Load Balancer with HTTPS Enforcement
            additionalBehaviors: {
                '/api/*': {
                    origin: albOrigin,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY, // Strict HTTPS enforcement for API traffic
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    cachePolicy: apiCachePolicy, // Preserves Authorization header while disabling response caching
                    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                    responseHeadersPolicy: this.responseHeadersPolicy,
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
        // 6. S3 Bucket Asset Deployment (Uploads frontend/dist build artifacts)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZXN5bmMtZnJvbnRlbmQtY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2FyZXN5bmMtZnJvbnRlbmQtY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyx5REFBeUQ7QUFDekQsOERBQThEO0FBQzlELHlDQUF5QztBQUN6QywwREFBMEQ7QUFDMUQsNkJBQTZCO0FBQzdCLDJDQUF1QztBQVV2QyxNQUFhLHlCQUEwQixTQUFRLHNCQUFTO0lBQ3RDLE1BQU0sQ0FBWTtJQUNsQixZQUFZLENBQTBCO0lBQ3RDLHFCQUFxQixDQUFtQztJQUV4RSxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXFDO1FBQzdFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEdBQUcsS0FBSyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQ2xFLE1BQU0sTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFdBQVcsSUFBSSxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFN0QsaUZBQWlGO1FBQ2pGLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNsRCxVQUFVLEVBQUUsR0FBRyxNQUFNLGtCQUFrQjtZQUN2QyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLGtEQUFrRDtZQUNyRyxVQUFVLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVU7WUFDMUMsVUFBVSxFQUFFLElBQUk7WUFDaEIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsOENBQThDO1NBQ3hFLENBQUMsQ0FBQztRQUVILHVGQUF1RjtRQUN2RixJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxVQUFVLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQy9GLHlCQUF5QixFQUFFLEdBQUcsTUFBTSxtQkFBbUI7WUFDdkQsdUJBQXVCLEVBQUU7Z0JBQ3ZCLHVCQUF1QixFQUFFO29CQUN2QixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7b0JBQ25ELGlCQUFpQixFQUFFLElBQUk7b0JBQ3ZCLFFBQVEsRUFBRSxJQUFJO29CQUNkLE9BQU8sRUFBRSxJQUFJO2lCQUNkO2dCQUNELGtCQUFrQixFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtnQkFDdEMsY0FBYyxFQUFFO29CQUNkLGNBQWMsRUFBRSxVQUFVLENBQUMscUJBQXFCLENBQUMsK0JBQStCO29CQUNoRixRQUFRLEVBQUUsSUFBSTtpQkFDZjtnQkFDRCxZQUFZLEVBQUU7b0JBQ1osV0FBVyxFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJO29CQUMvQyxRQUFRLEVBQUUsSUFBSTtpQkFDZjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsNkVBQTZFO1FBQzdFLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTdFLE1BQU0sU0FBUyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFO1lBQzdFLGNBQWMsRUFBRSxpQkFBaUI7Z0JBQy9CLENBQUMsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsVUFBVTtnQkFDNUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTO1lBQzdDLFFBQVEsRUFBRSxFQUFFO1lBQ1osU0FBUyxFQUFFLEdBQUc7U0FDZixDQUFDLENBQUM7UUFFSCxpR0FBaUc7UUFDakcsTUFBTSxjQUFjLEdBQUcsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4RSxlQUFlLEVBQUUsR0FBRyxNQUFNLGVBQWU7WUFDekMsT0FBTyxFQUFFLGtGQUFrRjtZQUMzRixVQUFVLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDL0IsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMvQixjQUFjLEVBQUUsVUFBVSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUM7WUFDL0csbUJBQW1CLEVBQUUsVUFBVSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRTtZQUM5RCxjQUFjLEVBQUUsVUFBVSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRTtTQUN0RCxDQUFDLENBQUM7UUFFSCxtRkFBbUY7UUFDbkYsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFVBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQzlFLE9BQU8sRUFBRSxZQUFZLE1BQU0sQ0FBQyxXQUFXLDhCQUE4QjtZQUNyRSxpQkFBaUIsRUFBRSxZQUFZO1lBQy9CLHlFQUF5RTtZQUN6RSxlQUFlLEVBQUU7Z0JBQ2YsTUFBTSxFQUFFLFFBQVE7Z0JBQ2hCLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUI7Z0JBQ3ZFLGNBQWMsRUFBRSxVQUFVLENBQUMsY0FBYyxDQUFDLGNBQWM7Z0JBQ3hELGFBQWEsRUFBRSxVQUFVLENBQUMsYUFBYSxDQUFDLGNBQWM7Z0JBQ3RELFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLGlCQUFpQjtnQkFDckQscUJBQXFCLEVBQUUsSUFBSSxDQUFDLHFCQUFxQjtnQkFDakQsUUFBUSxFQUFFLElBQUk7YUFDZjtZQUNELHlGQUF5RjtZQUN6RixtQkFBbUIsRUFBRTtnQkFDbkIsUUFBUSxFQUFFO29CQUNSLE1BQU0sRUFBRSxTQUFTO29CQUNqQixvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFLDJDQUEyQztvQkFDN0csY0FBYyxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsU0FBUztvQkFDbkQsV0FBVyxFQUFFLGNBQWMsRUFBRSxrRUFBa0U7b0JBQy9GLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyw2QkFBNkI7b0JBQ2pGLHFCQUFxQixFQUFFLElBQUksQ0FBQyxxQkFBcUI7aUJBQ2xEO2FBQ0Y7WUFDRCxzRkFBc0Y7WUFDdEYsY0FBYyxFQUFFO2dCQUNkO29CQUNFLFVBQVUsRUFBRSxHQUFHO29CQUNmLGtCQUFrQixFQUFFLEdBQUc7b0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7b0JBQy9CLEdBQUcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQzdCO2dCQUNEO29CQUNFLFVBQVUsRUFBRSxHQUFHO29CQUNmLGtCQUFrQixFQUFFLEdBQUc7b0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7b0JBQy9CLEdBQUcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQzdCO2FBQ0Y7WUFDRCxVQUFVLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUUsK0NBQStDO1NBQ25HLENBQUMsQ0FBQztRQUVILHdFQUF3RTtRQUN4RSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFFeEUsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzFELE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDbEQsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDOUIsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLGlCQUFpQixFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsOENBQThDO1NBQzFFLENBQUMsQ0FBQztRQUVILDRCQUE0QjtRQUM1QixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVU7WUFDN0IsV0FBVyxFQUFFLDREQUE0RDtTQUMxRSxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ2xELEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWM7WUFDdkMsV0FBVyxFQUFFLHFDQUFxQztTQUNuRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzlDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLHNCQUFzQjtZQUMvQyxXQUFXLEVBQUUsOENBQThDO1NBQzVELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxXQUFXLElBQUksQ0FBQyxZQUFZLENBQUMsc0JBQXNCLEVBQUU7WUFDNUQsV0FBVyxFQUFFLHNDQUFzQztTQUNwRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE1SUQsOERBNElDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBFbnZpcm9ubWVudENvbmZpZyB9IGZyb20gJy4uL2NvbmZpZy9lbnZpcm9ubWVudHMnO1xuaW1wb3J0IHsgQ2FyZVN5bmNFY3NDb25zdHJ1Y3QgfSBmcm9tICcuL2NhcmVzeW5jLWVjcy1jb25zdHJ1Y3QnO1xuXG5leHBvcnQgaW50ZXJmYWNlIENhcmVTeW5jRnJvbnRlbmRDb25zdHJ1Y3RQcm9wcyB7XG4gIGNvbmZpZzogRW52aXJvbm1lbnRDb25maWc7XG4gIGVjc0NvbnN0cnVjdDogQ2FyZVN5bmNFY3NDb25zdHJ1Y3Q7XG4gIHVzZUh0dHBzQWxiT3JpZ2luPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIENhcmVTeW5jRnJvbnRlbmRDb25zdHJ1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgYnVja2V0OiBzMy5CdWNrZXQ7XG4gIHB1YmxpYyByZWFkb25seSBkaXN0cmlidXRpb246IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgcmVzcG9uc2VIZWFkZXJzUG9saWN5OiBjbG91ZGZyb250LlJlc3BvbnNlSGVhZGVyc1BvbGljeTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ2FyZVN5bmNGcm9udGVuZENvbnN0cnVjdFByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHsgY29uZmlnLCBlY3NDb25zdHJ1Y3QsIHVzZUh0dHBzQWxiT3JpZ2luID0gZmFsc2UgfSA9IHByb3BzO1xuICAgIGNvbnN0IHByZWZpeCA9IGAke2NvbmZpZy5wcm9qZWN0TmFtZX0tJHtjb25maWcuZW52aXJvbm1lbnR9YDtcblxuICAgIC8vIDEuIFByaXZhdGUgUzMgQnVja2V0IGZvciBGcm9udGVuZCBTdGF0aWMgV2ViIEFzc2V0cyAoU3RyaWN0IE5vbi1QdWJsaWMgQWNjZXNzKVxuICAgIHRoaXMuYnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnRnJvbnRlbmRCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgJHtwcmVmaXh9LWZyb250ZW5kLWJ1Y2tldGAsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLCAvLyBGdWxseSBwcml2YXRlLCBubyBkaXJlY3QgcHVibGljIGludGVybmV0IGFjY2Vzc1xuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSwgLy8gQ29zdC1jb25zY2lvdXMgY2xlYW51cCBmb3IgZGVtbyBlbnZpcm9ubWVudFxuICAgIH0pO1xuXG4gICAgLy8gMi4gU2VjdXJpdHkgUmVzcG9uc2UgSGVhZGVycyBQb2xpY3kgKEhTVFMsIE5vLVNuaWZmLCBGcmFtZSBPcHRpb25zLCBSZWZlcnJlciBQb2xpY3kpXG4gICAgdGhpcy5yZXNwb25zZUhlYWRlcnNQb2xpY3kgPSBuZXcgY2xvdWRmcm9udC5SZXNwb25zZUhlYWRlcnNQb2xpY3kodGhpcywgJ1NlY3VyaXR5SGVhZGVyc1BvbGljeScsIHtcbiAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeU5hbWU6IGAke3ByZWZpeH0tc2VjdXJpdHktaGVhZGVyc2AsXG4gICAgICBzZWN1cml0eUhlYWRlcnNCZWhhdmlvcjoge1xuICAgICAgICBzdHJpY3RUcmFuc3BvcnRTZWN1cml0eToge1xuICAgICAgICAgIGFjY2Vzc0NvbnRyb2xNYXhBZ2U6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMxNTM2MDAwKSxcbiAgICAgICAgICBpbmNsdWRlU3ViZG9tYWluczogdHJ1ZSxcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcbiAgICAgICAgICBwcmVsb2FkOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICBjb250ZW50VHlwZU9wdGlvbnM6IHsgb3ZlcnJpZGU6IHRydWUgfSxcbiAgICAgICAgcmVmZXJyZXJQb2xpY3k6IHtcbiAgICAgICAgICByZWZlcnJlclBvbGljeTogY2xvdWRmcm9udC5IZWFkZXJzUmVmZXJyZXJQb2xpY3kuU1RSSUNUX09SSUdJTl9XSEVOX0NST1NTX09SSUdJTixcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgZnJhbWVPcHRpb25zOiB7XG4gICAgICAgICAgZnJhbWVPcHRpb246IGNsb3VkZnJvbnQuSGVhZGVyc0ZyYW1lT3B0aW9uLkRFTlksXG4gICAgICAgICAgb3ZlcnJpZGU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gMy4gQ2xvdWRGcm9udCBPcmlnaW5zOiBQcml2YXRlIFMzIChPQUMgQWNjZXNzKSAmIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXJcbiAgICBjb25zdCBzM09yaWdpbiA9IG9yaWdpbnMuUzNCdWNrZXRPcmlnaW4ud2l0aE9yaWdpbkFjY2Vzc0NvbnRyb2wodGhpcy5idWNrZXQpO1xuXG4gICAgY29uc3QgYWxiT3JpZ2luID0gbmV3IG9yaWdpbnMuSHR0cE9yaWdpbihlY3NDb25zdHJ1Y3QuYWxiLmxvYWRCYWxhbmNlckRuc05hbWUsIHtcbiAgICAgIHByb3RvY29sUG9saWN5OiB1c2VIdHRwc0FsYk9yaWdpblxuICAgICAgICA/IGNsb3VkZnJvbnQuT3JpZ2luUHJvdG9jb2xQb2xpY3kuSFRUUFNfT05MWVxuICAgICAgICA6IGNsb3VkZnJvbnQuT3JpZ2luUHJvdG9jb2xQb2xpY3kuSFRUUF9PTkxZLFxuICAgICAgaHR0cFBvcnQ6IDgwLFxuICAgICAgaHR0cHNQb3J0OiA0NDMsXG4gICAgfSk7XG5cbiAgICAvLyA0LiBBUEkgQ2FjaGUgUG9saWN5IChEaXNhYmxlcyBjYWNoaW5nIHdoaWxlIGFsbG93aW5nIEF1dGhvcml6YXRpb24gQmVhcmVyIHRva2VucyBpbiBDYWNoZSBLZXkpXG4gICAgY29uc3QgYXBpQ2FjaGVQb2xpY3kgPSBuZXcgY2xvdWRmcm9udC5DYWNoZVBvbGljeSh0aGlzLCAnQXBpQ2FjaGVQb2xpY3knLCB7XG4gICAgICBjYWNoZVBvbGljeU5hbWU6IGAke3ByZWZpeH0tYXBpLW5vLWNhY2hlYCxcbiAgICAgIGNvbW1lbnQ6ICdEaXNhYmxlcyBjYWNoaW5nIGZvciBkeW5hbWljIEFQSSByZXNwb25zZXMgd2hpbGUgcHJlc2VydmluZyBBdXRob3JpemF0aW9uIGhlYWRlcicsXG4gICAgICBkZWZhdWx0VHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcbiAgICAgIG1pblR0bDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksXG4gICAgICBtYXhUdGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEpLFxuICAgICAgaGVhZGVyQmVoYXZpb3I6IGNsb3VkZnJvbnQuQ2FjaGVIZWFkZXJCZWhhdmlvci5hbGxvd0xpc3QoJ0F1dGhvcml6YXRpb24nLCAnSWRlbXBvdGVuY3ktS2V5JywgJ1gtQWRtaW4tQVBJLUtleScpLFxuICAgICAgcXVlcnlTdHJpbmdCZWhhdmlvcjogY2xvdWRmcm9udC5DYWNoZVF1ZXJ5U3RyaW5nQmVoYXZpb3IuYWxsKCksXG4gICAgICBjb29raWVCZWhhdmlvcjogY2xvdWRmcm9udC5DYWNoZUNvb2tpZUJlaGF2aW9yLm5vbmUoKSxcbiAgICB9KTtcblxuICAgIC8vIDUuIENsb3VkRnJvbnQgR2xvYmFsIERpc3RyaWJ1dGlvbiB3aXRoIEhUVFBTIEVuZm9yY2VtZW50ICYgU2FtZS1PcmlnaW4gQVBJIFByb3h5XG4gICAgdGhpcy5kaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Nsb3VkRnJvbnREaXN0cmlidXRpb24nLCB7XG4gICAgICBjb21tZW50OiBgQ2FyZVN5bmMgJHtjb25maWcuZW52aXJvbm1lbnR9IENsb3VkRnJvbnQgQ0ROIERpc3RyaWJ1dGlvbmAsXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxuICAgICAgLy8gRGVmYXVsdCBCZWhhdmlvciAoU3RhdGljIFJlYWN0IFNQQSBBc3NldHMgcm91dGVkIHRvIHByaXZhdGUgUzMgQnVja2V0KVxuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIG9yaWdpbjogczNPcmlnaW4sXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRCxcbiAgICAgICAgY2FjaGVkTWV0aG9kczogY2xvdWRmcm9udC5DYWNoZWRNZXRob2RzLkNBQ0hFX0dFVF9IRUFELFxuICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5OiB0aGlzLnJlc3BvbnNlSGVhZGVyc1BvbGljeSxcbiAgICAgICAgY29tcHJlc3M6IHRydWUsXG4gICAgICB9LFxuICAgICAgLy8gQWRkaXRpb25hbCBCZWhhdmlvcjogL2FwaS8qIHJvdXRlZCB0byBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyIHdpdGggSFRUUFMgRW5mb3JjZW1lbnRcbiAgICAgIGFkZGl0aW9uYWxCZWhhdmlvcnM6IHtcbiAgICAgICAgJy9hcGkvKic6IHtcbiAgICAgICAgICBvcmlnaW46IGFsYk9yaWdpbixcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5IVFRQU19PTkxZLCAvLyBTdHJpY3QgSFRUUFMgZW5mb3JjZW1lbnQgZm9yIEFQSSB0cmFmZmljXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfQUxMLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBhcGlDYWNoZVBvbGljeSwgLy8gUHJlc2VydmVzIEF1dGhvcml6YXRpb24gaGVhZGVyIHdoaWxlIGRpc2FibGluZyByZXNwb25zZSBjYWNoaW5nXG4gICAgICAgICAgb3JpZ2luUmVxdWVzdFBvbGljeTogY2xvdWRmcm9udC5PcmlnaW5SZXF1ZXN0UG9saWN5LkFMTF9WSUVXRVJfRVhDRVBUX0hPU1RfSEVBREVSLFxuICAgICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeTogdGhpcy5yZXNwb25zZUhlYWRlcnNQb2xpY3ksXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgLy8gQ2xpZW50LVNpZGUgUm91dGluZyBTUEEgRmFsbGJhY2tzIChSZWRpcmVjdCA0MDMvNDA0IHRvIC9pbmRleC5odG1sIHdpdGggU3RhdHVzIDIwMClcbiAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDApLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBwcmljZUNsYXNzOiBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMTAwLCAvLyBDb3N0LWNvbnNjaW91cyBVUy9FdXJvcGUvQXNpYSBlZGdlIGxvY2F0aW9uc1xuICAgIH0pO1xuXG4gICAgLy8gNi4gUzMgQnVja2V0IEFzc2V0IERlcGxveW1lbnQgKFVwbG9hZHMgZnJvbnRlbmQvZGlzdCBidWlsZCBhcnRpZmFjdHMpXG4gICAgY29uc3QgZnJvbnRlbmREaXN0UGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9mcm9udGVuZC9kaXN0Jyk7XG5cbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCAnRGVwbG95RnJvbnRlbmRBc3NldHMnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KGZyb250ZW5kRGlzdFBhdGgpXSxcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiB0aGlzLmJ1Y2tldCxcbiAgICAgIGRpc3RyaWJ1dGlvbjogdGhpcy5kaXN0cmlidXRpb24sXG4gICAgICBkaXN0cmlidXRpb25QYXRoczogWycvKiddLCAvLyBJbnZhbGlkYXRlIENsb3VkRnJvbnQgQ0ROIGNhY2hlIG9uIHJlZGVwbG95XG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXQgQ2xvdWRGcm9udCBEZXRhaWxzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Zyb250ZW5kQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBQcml2YXRlIFMzIEJ1Y2tldCBOYW1lIGZvciBTdGF0aWMgRnJvbnRlbmQgQXNzZXRzJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250RGlzdHJpYnV0aW9uSWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NhcmVTeW5jIENsb3VkRnJvbnQgRGlzdHJpYnV0aW9uIElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250RG9tYWluTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdDYXJlU3luYyBDbG91ZEZyb250IERpc3RyaWJ1dGlvbiBEb21haW4gTmFtZScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udFVybCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke3RoaXMuZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2FyZVN5bmMgUHVibGljIENsb3VkRnJvbnQgSFRUUFMgVVJMJyxcbiAgICB9KTtcbiAgfVxufVxuIl19