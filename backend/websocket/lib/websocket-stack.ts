import * as cdk from 'aws-cdk-lib/core';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';

export class WebsocketStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const entry = path.join(__dirname, '..', 'lambda', 'index.ts');

    const connectFn = new NodejsFunction(this, 'ConnectFn', {
      entry,
      handler: 'connectHandler',
      runtime: Runtime.NODEJS_22_X,
    });

    const disconnectFn = new NodejsFunction(this, 'DisconnectFn', {
      entry,
      handler: 'disconnectHandler',
      runtime: Runtime.NODEJS_22_X,
    });

    const messageFn = new NodejsFunction(this, 'MessageFn', {
      entry,
      handler: 'messageHandler',
      runtime: Runtime.NODEJS_22_X,
    });

    const webSocketApi = new apigwv2.WebSocketApi(this, 'WebSocketApi', {
      connectRouteOptions: {
        integration: new apigwv2integrations.WebSocketLambdaIntegration('ConnectIntegration', connectFn),
      },
      disconnectRouteOptions: {
        integration: new apigwv2integrations.WebSocketLambdaIntegration('DisconnectIntegration', disconnectFn),
      },
      defaultRouteOptions: {
        integration: new apigwv2integrations.WebSocketLambdaIntegration('MessageIntegration', messageFn),
      },
    });

    const stage = new apigwv2.WebSocketStage(this, 'DevStage', {
      webSocketApi,
      stageName: 'dev',
      autoDeploy: true,
    });

    messageFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['execute-api:ManageConnections'],
        resources: [
          this.formatArn({
            service: 'execute-api',
            resource: webSocketApi.apiId,
            resourceName: `${stage.stageName}/POST/@connections/*`,
          }),
        ],
      }),
    );

    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: stage.url,
    });
  }
}
