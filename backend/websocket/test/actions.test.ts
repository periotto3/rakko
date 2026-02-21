import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { Card } from "../lambda/domain/model/card/card";
import { Player } from "../lambda/domain/model/player/player";
import { Game } from "../lambda/domain/model/game/game";
import { GamePhase } from "../lambda/domain/model/game/gamePhase";
import { ConnectionDynamoDBRepository } from "../lambda/infrastructure/dynamodb/connectionDynamoDBRepository";
import { MatchmakingDynamoDBRepository } from "../lambda/infrastructure/dynamodb/matchmakingDynamoDBRepository";
import { GameDynamoDBRepository } from "../lambda/infrastructure/dynamodb/gameDynamoDBRepository";
import { ApiGatewayNotificationService } from "../lambda/infrastructure/websocket/apiGatewayNotificationService";
import { JoinGameUseCase } from "../lambda/application/useCase/joinGameUseCase";
import { DrawCardUseCase } from "../lambda/application/useCase/drawCardUseCase";
import { GetStateUseCase } from "../lambda/application/useCase/getStateUseCase";

const ddbMock = mockClient(DynamoDBDocumentClient);
const apigwMock = mockClient(ApiGatewayManagementApiClient);

const ENDPOINT = "https://test.execute-api.ap-northeast-1.amazonaws.com/dev";
const TABLE_NAME = "TestTable";

// Setup DI
function createUseCases() {
  const ddbClient = new DynamoDBClient({ region: "ap-northeast-1" });
  const ctx = { ddb: DynamoDBDocumentClient.from(ddbClient), tableName: TABLE_NAME };
  const connectionRepo = new ConnectionDynamoDBRepository(ctx);
  const matchmakingRepo = new MatchmakingDynamoDBRepository(ctx);
  const gameRepo = new GameDynamoDBRepository(ctx);
  const notificationService = new ApiGatewayNotificationService(ENDPOINT, connectionRepo);
  return {
    joinGameUseCase: new JoinGameUseCase(connectionRepo, matchmakingRepo, gameRepo, notificationService),
    drawCardUseCase: new DrawCardUseCase(connectionRepo, gameRepo, notificationService),
    getStateUseCase: new GetStateUseCase(connectionRepo, gameRepo, notificationService),
  };
}

// Helper to create a card
function card(suit: Card["suit"], rank: number, id?: string): Card {
  const labels: Record<number, string> = {
    0: "JOKER", 1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7",
    8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K",
  };
  return new Card(id ?? `${suit}-${rank}`, suit, rank, labels[rank]);
}

function makePlayer(seatIndex: number, hand: Card[], connectionId?: string): Player {
  return new Player(
    connectionId ?? `conn-${seatIndex}`,
    `Player${seatIndex}`,
    ["😊", "🐱", "🐶", "🐰"][seatIndex],
    seatIndex,
    hand,
    null
  );
}

// Helper to extract messages sent via PostToConnection
function getSentMessages(): { connectionId: string; data: any }[] {
  const calls = apigwMock.commandCalls(PostToConnectionCommand);
  return calls.map((call) => ({
    connectionId: call.args[0].input.ConnectionId!,
    data: JSON.parse(Buffer.from(call.args[0].input.Data as any).toString()),
  }));
}

beforeEach(() => {
  ddbMock.reset();
  apigwMock.reset();
  apigwMock.on(PostToConnectionCommand).resolves({});
  process.env.TABLE_NAME = TABLE_NAME;
});

describe("JoinGameUseCase", () => {
  it("should send 'waiting' message when fewer than 4 players", async () => {
    const { joinGameUseCase } = createUseCases();
    // saveConnection → PutCommand
    ddbMock.on(PutCommand).resolves({});
    // getWaitingPlayers → QueryCommand returns 1 player
    ddbMock.on(QueryCommand).resolves({
      Items: [{ connectionId: "conn-0", playerName: "Alice" }],
    });
    // getRouletteState → no existing state
    ddbMock.on(GetCommand).resolves({});

    await joinGameUseCase.execute("conn-0", "Alice");

    const messages = getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].connectionId).toBe("conn-0");
    expect(messages[0].data.type).toBe("waiting");
    expect(messages[0].data.waitingCount).toBe(1);
    expect(messages[0].data.decidedSlots).toHaveLength(1);
    expect(messages[0].data.decidedSlots[0].key).toBe("who");
    expect(messages[0].data.newSlot.key).toBe("who");
    expect(messages[0].data.slotCandidates).toBeDefined();
    expect(messages[0].data.slotCandidates.who).toBeInstanceOf(Array);
  });

  it("should notify all waiting players of updated count", async () => {
    const { joinGameUseCase } = createUseCases();
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { connectionId: "conn-0", playerName: "Alice" },
        { connectionId: "conn-1", playerName: "Bob" },
        { connectionId: "conn-2", playerName: "Charlie" },
      ],
    });
    // 2 slots already decided from previous joins
    ddbMock.on(GetCommand).resolves({
      Item: { slots: [
        { key: "who", value: "みんなで", slotIndex: 0 },
        { key: "when", value: "深夜に", slotIndex: 1 },
      ] },
    });

    await joinGameUseCase.execute("conn-2", "Charlie");

    const messages = getSentMessages();
    expect(messages).toHaveLength(3);
    // All 3 waiting players should receive the same waitingCount
    for (const msg of messages) {
      expect(msg.data.type).toBe("waiting");
      expect(msg.data.waitingCount).toBe(3);
      expect(msg.data.decidedSlots).toHaveLength(3);
      expect(msg.data.newSlot.key).toBe("where");
      expect(msg.data.slotCandidates).toBeDefined();
      expect(Object.keys(msg.data.slotCandidates)).toHaveLength(4);
    }
  });

  it("should start game when 4 players join", async () => {
    const { joinGameUseCase } = createUseCases();
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(DeleteCommand).resolves({});
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { connectionId: "conn-0", playerName: "Alice" },
        { connectionId: "conn-1", playerName: "Bob" },
        { connectionId: "conn-2", playerName: "Charlie" },
        { connectionId: "conn-3", playerName: "Dave" },
      ],
    });
    // 3 slots already decided from previous joins
    ddbMock.on(GetCommand).resolves({
      Item: { slots: [
        { key: "who", value: "みんなで", slotIndex: 0 },
        { key: "when", value: "深夜に", slotIndex: 1 },
        { key: "where", value: "海辺で", slotIndex: 2 },
      ] },
    });

    await joinGameUseCase.execute("conn-3", "Dave");

    const messages = getSentMessages();
    // 4 waiting messages + 4 game_start messages
    const waitingMsgs = messages.filter((m) => m.data.type === "waiting");
    const gameStartMsgs = messages.filter((m) => m.data.type === "game_start");
    expect(waitingMsgs).toHaveLength(4);
    expect(gameStartMsgs).toHaveLength(4);

    for (const msg of gameStartMsgs) {
      expect(msg.data.gameId).toBeDefined();
      expect(msg.data.yourSeatIndex).toBeDefined();
      expect(msg.data.yourHand).toBeDefined();
      expect(Array.isArray(msg.data.players)).toBe(true);
      expect(msg.data.players).toHaveLength(4);
    }

    // Each player should receive their own unique hand
    const hands = gameStartMsgs.map((m) => m.data.yourHand);
    const handSets = hands.map((h: any[]) =>
      new Set(h.map((c: any) => c.id))
    );
    // Verify no two players have the exact same hand
    for (let i = 0; i < handSets.length; i++) {
      for (let j = i + 1; j < handSets.length; j++) {
        const overlap = [...handSets[i]].filter((id) => handSets[j].has(id));
        expect(overlap).toHaveLength(0);
      }
    }
  }, 10000);

  it("should remove matched players from matchmaking", async () => {
    const { joinGameUseCase } = createUseCases();
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(DeleteCommand).resolves({});
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { connectionId: "conn-0", playerName: "Alice" },
        { connectionId: "conn-1", playerName: "Bob" },
        { connectionId: "conn-2", playerName: "Charlie" },
        { connectionId: "conn-3", playerName: "Dave" },
      ],
    });
    // 3 slots already decided
    ddbMock.on(GetCommand).resolves({
      Item: { slots: [
        { key: "who", value: "みんなで", slotIndex: 0 },
        { key: "when", value: "深夜に", slotIndex: 1 },
        { key: "where", value: "海辺で", slotIndex: 2 },
      ] },
    });

    await joinGameUseCase.execute("conn-3", "Dave");

    // Should have called DeleteCommand 5 times (4 removeFromMatchmaking + 1 deleteRouletteState)
    const deleteCalls = ddbMock.commandCalls(DeleteCommand);
    expect(deleteCalls).toHaveLength(5);
  }, 10000);
});

describe("DrawCardUseCase", () => {
  function makeGameState(overrides?: {
    gameId?: string;
    phase?: GamePhase;
    players?: Player[];
    currentTurnIndex?: number;
    finishedCount?: number;
    version?: number;
  }): Game {
    return new Game(
      overrides?.gameId ?? "game-1",
      overrides?.phase ?? "playing",
      overrides?.players ?? [
        makePlayer(0, [card("spades", 1, "s1")], "conn-0"),
        makePlayer(1, [card("hearts", 2, "h2"), card("diamonds", 5, "d5")], "conn-1"),
        makePlayer(2, [card("clubs", 3, "c3")], "conn-2"),
        makePlayer(3, [card("spades", 8, "s8")], "conn-3"),
      ],
      overrides?.currentTurnIndex ?? 0,
      overrides?.finishedCount ?? 0,
      overrides?.version ?? 1
    );
  }

  // Convert Game class to plain record for DynamoDB mock responses
  function gameToRecord(game: Game) {
    return {
      gameId: game.gameId,
      phase: game.phase,
      players: game.players.map((p) => ({
        connectionId: p.connectionId,
        name: p.name,
        avatar: p.avatar,
        seatIndex: p.seatIndex,
        hand: p.hand.map((c) => ({ id: c.id, suit: c.suit, rank: c.rank, label: c.label })),
        finishedOrder: p.finishedOrder,
      })),
      currentTurnIndex: game.currentTurnIndex,
      finishedCount: game.finishedCount,
      version: game.version,
    };
  }

  it("should throw ApplicationError if player is not in a game", async () => {
    const { drawCardUseCase } = createUseCases();
    ddbMock.on(GetCommand).resolves({
      Item: { connectionId: "conn-0", playerName: "Alice", gameId: null },
    });

    await expect(drawCardUseCase.execute("conn-0", 0)).rejects.toThrow("You are not in a game");
  });

  it("should throw ApplicationError if it is not the player's turn", async () => {
    const { drawCardUseCase } = createUseCases();
    const game = makeGameState({ currentTurnIndex: 1 });
    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: gameToRecord(game) };
    });

    await expect(drawCardUseCase.execute("conn-0", 0)).rejects.toThrow("Not your turn");
  });

  it("should draw a card and broadcast result on valid turn", async () => {
    const { drawCardUseCase } = createUseCases();
    const game = makeGameState();
    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: gameToRecord(game) };
    });
    ddbMock.on(PutCommand).resolves({});

    await drawCardUseCase.execute("conn-0", 0);

    const messages = getSentMessages();
    // Should broadcast card_drawn to all 4 players, then game_state to all 4
    const cardDrawnMsgs = messages.filter((m) => m.data.type === "card_drawn");
    const gameStateMsgs = messages.filter((m) => m.data.type === "game_state");
    expect(cardDrawnMsgs).toHaveLength(4);
    expect(gameStateMsgs).toHaveLength(4);

    // Verify card_drawn content
    expect(cardDrawnMsgs[0].data.drawerSeat).toBe(0);
    expect(cardDrawnMsgs[0].data.targetSeat).toBe(1);
    expect(typeof cardDrawnMsgs[0].data.paired).toBe("boolean");
  });

  it("should throw ApplicationError for invalid card index", async () => {
    const { drawCardUseCase } = createUseCases();
    const game = makeGameState();
    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: gameToRecord(game) };
    });

    await expect(drawCardUseCase.execute("conn-0", 99)).rejects.toThrow("Invalid card index");
  });

  it("should send game_over when game ends", async () => {
    const { drawCardUseCase } = createUseCases();
    const game = new Game(
      "game-1", "playing",
      [
        makePlayer(0, [card("spades", 5, "s5")], "conn-0"),
        makePlayer(1, [card("hearts", 5, "h5")], "conn-1"),
        new Player("conn-2", "Player2", "🐶", 2, [], 1),
        new Player("conn-3", "Player3", "🐰", 3, [], 2),
      ],
      0, 2, 1
    );

    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: gameToRecord(game) };
    });
    ddbMock.on(PutCommand).resolves({});

    await drawCardUseCase.execute("conn-0", 0);

    const messages = getSentMessages();
    const gameOverMsgs = messages.filter((m) => m.data.type === "game_over");
    expect(gameOverMsgs.length).toBeGreaterThanOrEqual(4);
    expect(gameOverMsgs[0].data.rankings).toBeDefined();
    expect(Array.isArray(gameOverMsgs[0].data.rankings)).toBe(true);
  });

  it("should throw ApplicationError if game is not active", async () => {
    const { drawCardUseCase } = createUseCases();
    const game = makeGameState({ phase: "finished" });
    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: gameToRecord(game) };
    });

    await expect(drawCardUseCase.execute("conn-0", 0)).rejects.toThrow("Game is not active");
  });
});

describe("GetStateUseCase", () => {
  function gameToRecord(game: Game) {
    return {
      gameId: game.gameId,
      phase: game.phase,
      players: game.players.map((p) => ({
        connectionId: p.connectionId,
        name: p.name,
        avatar: p.avatar,
        seatIndex: p.seatIndex,
        hand: p.hand.map((c) => ({ id: c.id, suit: c.suit, rank: c.rank, label: c.label })),
        finishedOrder: p.finishedOrder,
      })),
      currentTurnIndex: game.currentTurnIndex,
      finishedCount: game.finishedCount,
      version: game.version,
    };
  }

  it("should send game_state with player's own hand", async () => {
    const { getStateUseCase } = createUseCases();
    const game = new Game(
      "game-1", "playing",
      [
        new Player("conn-0", "Player0", "😊", 0, [card("spades", 1, "s1"), card("hearts", 5, "h5")], null),
        new Player("conn-1", "Player1", "🐱", 1, [card("diamonds", 3, "d3")], null),
      ],
      0, 0, 1
    );

    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: gameToRecord(game) };
    });

    await getStateUseCase.execute("conn-0");

    const messages = getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].data.type).toBe("game_state");
    expect(messages[0].data.phase).toBe("playing");
    // Should include the requesting player's hand
    expect(messages[0].data.yourHand).toEqual([
      { id: "s1", suit: "spades", rank: 1, label: "A" },
      { id: "h5", suit: "hearts", rank: 5, label: "5" },
    ]);
    // Should include public player info
    expect(messages[0].data.players).toHaveLength(2);
    expect(messages[0].data.players[0].cardCount).toBe(2);
    expect(messages[0].data.players[1].cardCount).toBe(1);
    // Public players should NOT include hand details
    expect(messages[0].data.players[0].hand).toBeUndefined();
  });

  it("should throw ApplicationError if player is not in a game", async () => {
    const { getStateUseCase } = createUseCases();
    ddbMock.on(GetCommand).resolves({
      Item: { connectionId: "conn-0", playerName: "Alice", gameId: null },
    });

    await expect(getStateUseCase.execute("conn-0")).rejects.toThrow("You are not in a game");
  });

  it("should throw ApplicationError if game is not found", async () => {
    const { getStateUseCase } = createUseCases();
    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: undefined };
    });

    await expect(getStateUseCase.execute("conn-0")).rejects.toThrow("Game not found");
  });

  it("should throw ApplicationError if player is not in this game", async () => {
    const { getStateUseCase } = createUseCases();
    const game = new Game(
      "game-1", "playing",
      [new Player("other-conn", "Player0", "😊", 0, [card("spades", 1, "s1")], null)],
      0, 0, 1
    );

    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: gameToRecord(game) };
    });

    await expect(getStateUseCase.execute("conn-0")).rejects.toThrow("You are not in this game");
  });
});
