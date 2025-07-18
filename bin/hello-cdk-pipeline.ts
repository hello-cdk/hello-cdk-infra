#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {HelloCdkPipelineStack} from "../lib/hello-cdk-pipeline-stack";
import {githubBranch, prodEnv, repo, stageEnv, tools} from "./env";

const app = new cdk.App();
new HelloCdkPipelineStack(app, 'hello-cdk-pipeline', {
    stackName: 'hello-cdk-pipeline',
    repo: repo,
    githubBranch: githubBranch,
    env: tools,
    stageEnv: stageEnv,
    prodEnv: prodEnv
});