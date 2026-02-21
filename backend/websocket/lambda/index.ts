import { APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

export async function connectHandler(event: APIGatewayProxyWebsocketEventV2) {
  console.log("Connected:", event.requestContext.connectionId);
  return { statusCode: 200, body: "Connected" };
}

export async function disconnectHandler(
  event: APIGatewayProxyWebsocketEventV2,
) {
  console.log("Disconnected:", event.requestContext.connectionId);
  return { statusCode: 200, body: "Disconnected" };
}

export async function messageHandler(event: APIGatewayProxyWebsocketEventV2) {
  const { connectionId, domainName, stage } = event.requestContext;
  const endpoint = `https://${domainName}/${stage}`;
  const client = new ApiGatewayManagementApiClient({ endpoint });

  const body = JSON.parse(event.body ?? "{}");
  await client.send(
    new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify({ message: body.message ?? body }),
    }),
  );

  return { statusCode: 200, body: "Message sent" };
}
