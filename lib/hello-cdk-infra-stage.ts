import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {StackSteps} from "aws-cdk-lib/pipelines";
import {HelloCdkS3Stack} from "./shared/hello-cdk-s3-stack";
import {ApiGatewayStack} from "./hello-cdk/api-gateway/api-gateway-stack";
import {ThisEnvironment} from "../bin/env/interfaces";
import {CloudfrontStack} from "./hello-cdk/cloudfront-stack";


interface HelloCdkStageProps extends cdk.StageProps {
    isProduction: boolean
    env: ThisEnvironment
}

export class HelloCdkStage extends cdk.Stage {
    stackSteps: StackSteps[] = []

    constructor(scope: Construct, id: string, props: HelloCdkStageProps) {
        super(scope, id, props);

        const s3 = new HelloCdkS3Stack(this, 's3', {})

        const api = new ApiGatewayStack(this, 'api-gw', {
            env: props.env
        })
        new CloudfrontStack(this, 'cloudfront', {
            env: props.env,
            api: api.api
        })
    }
}
