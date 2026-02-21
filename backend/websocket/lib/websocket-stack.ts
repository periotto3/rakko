import * as cdk from 'aws-cdk-lib/core';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';

export class WebsocketStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table for connections and game state
    const table = new dynamodb.Table(this, 'GameTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    const entry = path.join(__dirname, '..', 'lambda', 'index.ts');

    const bundling = {
      externalModules: ['@aws-sdk/*'],
    };

    const environment = {
      TABLE_NAME: table.tableName,
    };

    const connectFn = new NodejsFunction(this, 'ConnectFn', {
      entry,
      handler: 'connectHandler',
      runtime: Runtime.NODEJS_22_X,
      bundling,
      environment,
    });

    const disconnectFn = new NodejsFunction(this, 'DisconnectFn', {
      entry,
      handler: 'disconnectHandler',
      runtime: Runtime.NODEJS_22_X,
      bundling,
      environment,
    });

    const messageFn = new NodejsFunction(this, 'MessageFn', {
      entry,
      handler: 'messageHandler',
      runtime: Runtime.NODEJS_22_X,
      bundling,
      environment,
    });

    // Grant DynamoDB access to all Lambdas
    table.grantReadWriteData(connectFn);
    table.grantReadWriteData(disconnectFn);
    table.grantReadWriteData(messageFn);

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

    const manageConnectionsPolicy = new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [
        this.formatArn({
          service: 'execute-api',
          resource: webSocketApi.apiId,
          resourceName: `${stage.stageName}/POST/@connections/*`,
        }),
      ],
    });

    // Grant ManageConnections to all Lambdas that need to send messages
    connectFn.addToRolePolicy(manageConnectionsPolicy);
    disconnectFn.addToRolePolicy(manageConnectionsPolicy);
    messageFn.addToRolePolicy(manageConnectionsPolicy);

    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: stage.url,
    });
  }
}
