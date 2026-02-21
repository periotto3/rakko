// Infrastructure
import { createDynamoDBClient } from "./infrastructure/dynamodb/dynamoDBClient.js";
import { GameDynamoDBRepository } from "./infrastructure/dynamodb/gameDynamoDBRepository.js";
import { ConnectionDynamoDBRepository } from "./infrastructure/dynamodb/connectionDynamoDBRepository.js";
import { MatchmakingDynamoDBRepository } from "./infrastructure/dynamodb/matchmakingDynamoDBRepository.js";
import { ApiGatewayNotificationService } from "./infrastructure/websocket/apiGatewayNotificationService.js";
import { HttpImageGenerationService } from "./infrastructure/http/httpImageGenerationService.js";

// UseCases
import { ConnectUseCase } from "./application/useCase/connectUseCase.js";
import { DisconnectUseCase } from "./application/useCase/disconnectUseCase.js";
import { JoinGameUseCase } from "./application/useCase/joinGameUseCase.js";
import { DrawCardUseCase } from "./application/useCase/drawCardUseCase.js";
import { GetStateUseCase } from "./application/useCase/getStateUseCase.js";

// Presentation
import { createConnectHandler } from "./presentation/handler/connectHandler.js";
import { createDisconnectHandler } from "./presentation/handler/disconnectHandler.js";
import { createMessageHandler } from "./presentation/handler/messageHandler.js";

// --- DI Container（手動コンストラクタ注入）---
const ddb = createDynamoDBClient();

const gameRepo = new GameDynamoDBRepository(ddb);
const connectionRepo = new ConnectionDynamoDBRepository(ddb);
const matchmakingRepo = new MatchmakingDynamoDBRepository(ddb);

function createNotificationService(endpoint: string) {
  return new ApiGatewayNotificationService(endpoint, connectionRepo);
}

const imageGenerationService = new HttpImageGenerationService(process.env.IMAGE_API_URL!);

const connectUseCase = new ConnectUseCase(connectionRepo);
const disconnectUseCase = new DisconnectUseCase(connectionRepo, matchmakingRepo);

// --- Lambda Handler Exports ---
export const connectHandler = createConnectHandler(connectUseCase);
export const disconnectHandler = createDisconnectHandler(disconnectUseCase);
export const messageHandler = createMessageHandler(
  (endpoint) => new JoinGameUseCase(connectionRepo, matchmakingRepo, gameRepo, createNotificationService(endpoint), imageGenerationService),
  (endpoint) => new DrawCardUseCase(connectionRepo, gameRepo, createNotificationService(endpoint)),
  (endpoint) => new GetStateUseCase(connectionRepo, gameRepo, createNotificationService(endpoint)),
  createNotificationService
);
