import { APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import { JoinGameUseCase } from "../../application/useCase/joinGameUseCase.js";
import { DrawCardUseCase } from "../../application/useCase/drawCardUseCase.js";
import { GetStateUseCase } from "../../application/useCase/getStateUseCase.js";
import { ApplicationError } from "../../application/error/applicationError.js";
import { NotificationService } from "../../domain/model/notification/notificationService.js";
import { ClientMessage } from "../dto/clientMessage.js";

export function createMessageHandler(
  joinGameUseCaseFactory: (endpoint: string) => JoinGameUseCase,
  drawCardUseCaseFactory: (endpoint: string) => DrawCardUseCase,
  getStateUseCaseFactory: (endpoint: string) => GetStateUseCase,
  notificationServiceFactory: (endpoint: string) => NotificationService
) {
  return async (event: APIGatewayProxyWebsocketEventV2) => {
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
          await joinGameUseCaseFactory(endpoint).execute(connectionId!, body.playerName);
          break;
        case "draw_card":
          await drawCardUseCaseFactory(endpoint).execute(connectionId!, body.cardIndex);
          break;
        case "get_state":
          await getStateUseCaseFactory(endpoint).execute(connectionId!);
          break;
        default:
          return { statusCode: 400, body: "Unknown action" };
      }
    } catch (err) {
      if (err instanceof ApplicationError) {
        const notificationService = notificationServiceFactory(endpoint);
        await notificationService.sendToConnection(connectionId!, {
          type: "error",
          message: err.message,
        });
        return { statusCode: 200, body: "OK" };
      }
      console.error("Error handling action:", err);
      return { statusCode: 500, body: "Internal server error" };
    }

    return { statusCode: 200, body: "OK" };
  };
}
