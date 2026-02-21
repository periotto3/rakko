#!/usr/bin/env node
import 'dotenv/config';
import * as cdk from "aws-cdk-lib/core";
import { WebsocketStack } from "../lib/websocket-stack";

const app = new cdk.App();
new WebsocketStack(app, "WebsocketStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "ap-northeast-1", // 東京リージョン
  },
});
