import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";

interface HelloCdkS3StackProps extends cdk.StackProps {

}

export class HelloCdkS3Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: HelloCdkS3StackProps) {
        super(scope, id, props);

        const bucket = new Bucket(this, 'bucket')
    }
}
