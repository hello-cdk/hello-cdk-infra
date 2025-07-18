import {Environment} from 'aws-cdk-lib'

export interface ThisEnvironment extends Environment {
    account: string
    region: string
    cidr: string
    domainName: string
    subdomainName: string
    slack: { alarmWebhook: string }
    frontend: {
        VITE_APP_TEST: string
    }
}
