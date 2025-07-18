import {Environment} from 'aws-cdk-lib'
import {ThisEnvironment} from "./interfaces";


export const repo = 'hello-cdk/hello-cdk-infra'
export const githubBranch = 'main'

export const tools: Environment = {account: '671956027531', region: 'us-east-1'} // Tools account - where to deploy pipelines

export const stageEnv: ThisEnvironment = {
    account: '277707141071',
    region: 'us-east-1',
    cidr: '10.1.0.0/16',
    domainName: 'stage.prettysolution.com',
    subdomainName: 'hello-cdk',
    slack: {alarmWebhook: 'https://...'},
    frontend: {
        VITE_APP_TEST: 'hello',
    },
}
export const prodEnv: ThisEnvironment = {
    account: '268591637005',
    region: 'us-east-1',
    cidr: '10.2.0.0/16',
    domainName: 'prettysolution.com',
    subdomainName: 'hello-cdk',
    slack: {alarmWebhook: 'https://...'},
    frontend: {
        VITE_APP_TEST: 'hello',
    },

}
