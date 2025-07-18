import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import {
    AllowedMethods,
    CachePolicy,
    Distribution,
    OriginRequestPolicy,
    ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront'
import {ARecord, HostedZone, RecordTarget} from "aws-cdk-lib/aws-route53";
import {CertificateValidation, Certificate} from "aws-cdk-lib/aws-certificatemanager";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {HttpOrigin, S3BucketOrigin} from "aws-cdk-lib/aws-cloudfront-origins";
import {DockerImage, Duration} from "aws-cdk-lib";
import {BucketDeployment, Source} from 'aws-cdk-lib/aws-s3-deployment';
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets";
import {ThisEnvironment} from "../../bin/env/interfaces";
import {HttpApi} from "aws-cdk-lib/aws-apigatewayv2";
import path from "node:path";

interface CloudfrontStackProps extends cdk.StackProps {
    env: ThisEnvironment
    api: HttpApi
}

export class CloudfrontStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: CloudfrontStackProps) {
        super(scope, id, props);

        // ################## HostedZone and Certificate ######################
        const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
            domainName: props.env.domainName,
        })

        const cert = new Certificate(this, 'DnsValidatedCertificate', {
            validation: CertificateValidation.fromDns(hostedZone),
            domainName: hostedZone.zoneName,
            subjectAlternativeNames: [`*.${hostedZone.zoneName}`],
        })

        const webSiteBucket = new Bucket(this, 'WebSiteBucket')
        const distribution = new Distribution(this, 'Distribution', {
            defaultRootObject: 'index.html',
            defaultBehavior: {
                origin: S3BucketOrigin.withOriginAccessControl(webSiteBucket),
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            additionalBehaviors: {
                'api/*': {
                    origin: new HttpOrigin(`${props.api.apiId}.execute-api.${this.region}.amazonaws.com`),
                    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowedMethods: AllowedMethods.ALLOW_ALL,
                    cachePolicy: CachePolicy.CACHING_DISABLED,
                    originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                },
            },
            domainNames: [`${props.env.subdomainName}.${hostedZone.zoneName}`],
            certificate: cert,
            errorResponses: [
                {httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: Duration.minutes(5)},
                {httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: Duration.minutes(5)},
            ],
        });

        new BucketDeployment(this, 'BucketDeployment', {
            sources: [
                Source.asset(path.join(process.cwd(), '../hello-cdk-web'), {
                    bundling: {
                        // image: DockerImage.fromRegistry('public.ecr.aws/docker/library/node:22.16.0'),
                        image: DockerImage.fromRegistry('node:22.16.0'),
                        user: 'root:root',
                        command: ['sh', '-c', 'npm i && npm run build && cp -R ./dist/* /asset-output/'],
                        environment: {
                            VITE_COGNITO_REDIRECT_URI: `https://${props.env.subdomainName}.${props.env.domainName}/`,
                            ...props.env.frontend,
                        },
                    },
                }),
                // Source.data('/assets/settings.js', `window.appSettings = {\'version\': \'${version}\', \'commitId\': \'${commitId}\'};`),
                // Source.jsonData('/assets/settings.json', {version: version, commitId: commitId}),
            ],
            destinationBucket: webSiteBucket,
            distributionPaths: ['/*'],
            distribution,
        });

        new ARecord(this, 'ARecord', {
            recordName: props.env.subdomainName,
            zone: hostedZone,
            target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
        });
    }
}