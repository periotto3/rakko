import { APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import {
  saveConnection,
  deleteConnection,
  removeFromMatchmaking,
} from "./lib/db";
import { handleJoin } from "./lib/actions/join";
import { handleDrawCard } from "./lib/actions/draw-card";
import { handleGetState } from "./lib/actions/get-state";
import { ClientMessage } from "./lib/types";

export async function connectHandler(event: APIGatewayProxyWebsocketEventV2) {
  const connectionId = event.requestContext.connectionId!;
  console.log("Connected:", connectionId);

  await saveConnection(connectionId, "");

  return { statusCode: 200, body: "Connected" };
}

export async function disconnectHandler(
  event: APIGatewayProxyWebsocketEventV2
) {
  const connectionId = event.requestContext.connectionId!;
  console.log("Disconnected:", connectionId);

  await removeFromMatchmaking(connectionId);
  await deleteConnection(connectionId);

  return { statusCode: 200, body: "Disconnected" };
}

export async function messageHandler(event: APIGatewayProxyWebsocketEventV2) {
  const { connectionId, domainName, stage } = event.requestContext;
  const endpoint = `https://${domainName}/${stage}`;

  let body: ClientMessage;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  try {
    switch (body.action) {
      case "join":
        await handleJoin(endpoint, connectionId!, body.playerName);
        break;
      case "draw_card":
        await handleDrawCard(endpoint, connectionId!, body.cardIndex);
        break;
      case "get_state":
        await handleGetState(endpoint, connectionId!);
        break;
      default:
        return { statusCode: 400, body: "Unknown action" };
    }
  } catch (err) {
    console.error("Error handling action:", err);
    return { statusCode: 500, body: "Internal server error" };
  }

  return { statusCode: 200, body: "OK" };
}
