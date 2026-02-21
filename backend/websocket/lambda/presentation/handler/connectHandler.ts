import { APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import { ConnectUseCase } from "../../application/useCase/connectUseCase.js";

export function createConnectHandler(connectUseCase: ConnectUseCase) {
  return async (event: APIGatewayProxyWebsocketEventV2) => {
    const connectionId = event.requestContext.connectionId!;
    console.log("Connected:", connectionId);

    await connectUseCase.execute(connectionId);

    return { statusCode: 200, body: "Connected" };
  };
}
