import path from 'path';
import {Duration, Stack, StackProps} from 'aws-cdk-lib';
import {CorsHttpMethod, HttpApi, HttpMethod} from 'aws-cdk-lib/aws-apigatewayv2';
import {HttpLambdaIntegration} from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {RetentionDays} from 'aws-cdk-lib/aws-logs';
import {Construct} from 'constructs';
import {ThisEnvironment} from "../../../bin/env/interfaces";

interface ApiGatewayStackProps extends StackProps {
    env: ThisEnvironment;
}

export class ApiGatewayStack extends Stack {
    readonly api: HttpApi;

    constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
        super(scope, id, props);


        const apiLambda = new NodejsFunction(this, 'apiLambda', {
            runtime: Runtime.NODEJS_22_X,
            entry: path.join(__dirname, './api-lambda/serverless.ts'),
            logRetention: RetentionDays.ONE_MONTH,
            timeout: Duration.seconds(5),
        });

        this.api = new HttpApi(this, 'httpApi', {
            disableExecuteApiEndpoint: false,
            corsPreflight: {
                allowHeaders: ['*'],
                allowMethods: [CorsHttpMethod.ANY],
                allowOrigins: ['*'],
            },
        });

        this.api.addRoutes({
            path: '/api/{proxy+}',
            methods: [HttpMethod.ANY],
            integration: new HttpLambdaIntegration('integration', apiLambda),
        });
    }
}
