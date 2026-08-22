import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { CareSyncEcsConstruct } from './caresync-ecs-construct';

export interface CareSyncFrontendConstructProps {
  config: EnvironmentConfig;
  ecsConstruct: CareSyncEcsConstruct;
}

export class CareSyncFrontendConstruct extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CareSyncFrontendConstructProps) {
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
