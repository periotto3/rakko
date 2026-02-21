import { APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import { DisconnectUseCase } from "../../application/useCase/disconnectUseCase.js";

export function createDisconnectHandler(disconnectUseCase: DisconnectUseCase) {
  return async (event: APIGatewayProxyWebsocketEventV2) => {
    const connectionId = event.requestContext.connectionId!;
    console.log("Disconnected:", connectionId);

    await disconnectUseCase.execute(connectionId);

    return { statusCode: 200, body: "Disconnected" };
  };
}
