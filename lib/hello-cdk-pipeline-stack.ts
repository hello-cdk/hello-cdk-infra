import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Environment, pipelines} from "aws-cdk-lib";
import {ComputeType, LinuxBuildImage} from "aws-cdk-lib/aws-codebuild";
import {ManualApprovalStep, ShellStep} from "aws-cdk-lib/pipelines";
import {HelloCdkStage} from "./hello-cdk-infra-stage";
import {ThisEnvironment} from "../bin/env/interfaces";

interface HelloCdkPipelineStackProps extends cdk.StackProps {
    repo: string
    githubBranch: string
    env: Environment
    stageEnv: ThisEnvironment
    prodEnv: ThisEnvironment
}

export class HelloCdkPipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: HelloCdkPipelineStackProps) {
        super(scope, id, props);

        const repo = props.repo
        const githubBranch = props.githubBranch

        const pipelineInput = pipelines.CodePipelineSource.connection(repo, githubBranch, {
            connectionArn: 'arn:aws:codeconnections:us-east-1:todo',
            codeBuildCloneOutput: true,
            triggerOnPush: false,
        })

        const pipeline = new pipelines.CodePipeline(this, 'pipeline', {
            pipelineName: 'pipeline',
            crossAccountKeys: true,
            codeBuildDefaults: {
                buildEnvironment: {buildImage: LinuxBuildImage.STANDARD_7_0, privileged: true},
            },
            synthCodeBuildDefaults: {
                buildEnvironment: {
                    buildImage: LinuxBuildImage.STANDARD_7_0,
                    privileged: true,
                    computeType: ComputeType.MEDIUM,
                },
            },
            synth: new pipelines.ShellStep('Synth', {
                input: pipelineInput,
                commands: ['npm run build', 'npm run test', `npm run cdk synth ${this.stackName}`],
                env: {
                    // GH_TOKEN: secrets.secretValueFromJson('GH_TOKEN').unsafeUnwrap(),
                },
                installCommands: [
                    `git clone --branch main https://oauth2:$GH_TOKEN@github.com/hello-cdk/hello-cdk-web.git ../hello-cdk-web`,
                    'npm ci',
                ],
            }),
        })

        if (process.env.CODEBUILD_CI || process.env.AWS_PROFILE == 'ps_stage') {
            const stageStage = new HelloCdkStage(this, 'stage', {
                env: props.stageEnv,
                isProduction: false,
            })
            const stage = pipeline.addStage(stageStage, {stackSteps: stageStage.stackSteps})
            stage.addPre(new ShellStep('NotifyPWaiting', {
                commands: [
                    'curl --silent --show-error -X POST ' +
                    `--location  "${props.prodEnv.slack.alarmWebhook}" ` +
                    '--data \'{"text": "PROD is waiting for approval"}\' -H "Content-Type: application/json"',
                ],
            }))

        }

        if (process.env.CODEBUILD_CI || process.env.AWS_PROFILE == 'ps_prod') {
            // if you do deploy from CLI make sure war-room-front git tag has been set respectively to what is set in ci/war-room-frontend.json
            // if (process.env.CODEBUILD_CI) {
            // TODO: add validation if needed https://docs.aws.amazon.com/cdk/api/v1/docs/pipelines-readme.html#validation
            const prodStage = new HelloCdkStage(this, 'prod', {
                env: props.stageEnv,
                isProduction: true,
            })
            const prod = pipeline.addStage(prodStage, {stackSteps: prodStage.stackSteps})
            prod.addPre(new ShellStep('NotifyPWaiting', {
                commands: [
                    'curl --silent --show-error -X POST ' +
                    `--location  "${props.prodEnv.slack.alarmWebhook}" ` +
                    '--data \'{"text": "PROD is waiting for approval"}\' -H "Content-Type: application/json"',
                ],
            }))
            const prodApproval = new ManualApprovalStep('PromoteToProd')
            prod.addPre(prodApproval)
            const prodApproved = new ShellStep('NotifyPApproved', {
                commands: [
                    'curl --silent --show-error -X POST ' +
                    `--location  "${props.prodEnv.slack.alarmWebhook}" ` +
                    '--data \'{"text": "PROD is Approved"}\' -H "Content-Type: application/json"',
                ],
            })
            prod.addPre(prodApproved)
            prodApproved.addStepDependency(prodApproval)
            prod.addPost(new ShellStep('NotifyPFinished', {
                commands: [
                    'curl --silent --show-error -X POST ' +
                    '--location "https://chat.googleapis.com/v1/spaces/AAAAOOvuUdc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=NF9fIr5a4hCkNCHxz7JGs-LqqwaT4qnY16V8FOGND3A" ' +
                    '--data \'{"text": "UD Pipeline Finished"}\' -H "Content-Type: application/json"',
                ],
            }))
        }


    }
}
