#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ChatApiStack } from "../lib/chat-api-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || "us-east-1",
};

new ChatApiStack(app, "ChatApiStack", {
  env,
  allowedOrigins: [
    "https://eribertolopez.com",
    "https://www.eribertolopez.com",
    "https://d3flqn9a3eglfg.cloudfront.net",
    "http://localhost:3000",
  ],
  bedrockRegion: "us-east-1",
});

app.synth();
