import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { handleJoin } from "../lambda/lib/actions/join";
import { handleDrawCard } from "../lambda/lib/actions/draw-card";
import { handleGetState } from "../lambda/lib/actions/get-state";
import { Card, GameState, Player } from "../lambda/lib/types";

const ddbMock = mockClient(DynamoDBDocumentClient);
const apigwMock = mockClient(ApiGatewayManagementApiClient);

const ENDPOINT = "https://test.execute-api.ap-northeast-1.amazonaws.com/dev";

// Helper to create a card
function card(suit: Card["suit"], rank: number, id?: string): Card {
  const labels: Record<number, string> = {
    0: "JOKER", 1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7",
    8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K",
  };
  return { id: id ?? `${suit}-${rank}`, suit, rank, label: labels[rank] };
}

function makePlayer(seatIndex: number, hand: Card[], connectionId?: string): Player {
  return {
    connectionId: connectionId ?? `conn-${seatIndex}`,
    name: `Player${seatIndex}`,
    avatar: ["😊", "🐱", "🐶", "🐰"][seatIndex],
    seatIndex,
    hand,
    finishedOrder: null,
  };
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
  process.env.TABLE_NAME = "TestTable";
});

describe("handleJoin", () => {
  it("should send 'waiting' message when fewer than 4 players", async () => {
    // saveConnection → PutCommand
    ddbMock.on(PutCommand).resolves({});
    // getWaitingPlayers → QueryCommand returns 1 player
    ddbMock.on(QueryCommand).resolves({
      Items: [{ connectionId: "conn-0", playerName: "Alice" }],
    });

    await handleJoin(ENDPOINT, "conn-0", "Alice");

    const messages = getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].connectionId).toBe("conn-0");
    expect(messages[0].data).toEqual({
      type: "waiting",
      waitingCount: 1,
    });
  });

  it("should notify all waiting players of updated count", async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { connectionId: "conn-0", playerName: "Alice" },
        { connectionId: "conn-1", playerName: "Bob" },
        { connectionId: "conn-2", playerName: "Charlie" },
      ],
    });

    await handleJoin(ENDPOINT, "conn-2", "Charlie");

    const messages = getSentMessages();
    expect(messages).toHaveLength(3);
    // All 3 waiting players should receive the same waitingCount
    for (const msg of messages) {
      expect(msg.data.type).toBe("waiting");
      expect(msg.data.waitingCount).toBe(3);
    }
  });

  it("should start game when 4 players join", async () => {
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

    await handleJoin(ENDPOINT, "conn-3", "Dave");

    const messages = getSentMessages();
    // Each of the 4 players should receive a game_start message
    expect(messages).toHaveLength(4);
    for (const msg of messages) {
      expect(msg.data.type).toBe("game_start");
      expect(msg.data.gameId).toBeDefined();
      expect(msg.data.yourSeatIndex).toBeDefined();
      expect(msg.data.yourHand).toBeDefined();
      expect(Array.isArray(msg.data.players)).toBe(true);
      expect(msg.data.players).toHaveLength(4);
    }

    // Each player should receive their own unique hand
    const hands = messages.map((m) => m.data.yourHand);
    const handSets = hands.map((h: Card[]) =>
      new Set(h.map((c: Card) => c.id))
    );
    // Verify no two players have the exact same hand
    for (let i = 0; i < handSets.length; i++) {
      for (let j = i + 1; j < handSets.length; j++) {
        const overlap = [...handSets[i]].filter((id) => handSets[j].has(id));
        expect(overlap).toHaveLength(0);
      }
    }
  });

  it("should remove matched players from matchmaking", async () => {
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

    await handleJoin(ENDPOINT, "conn-3", "Dave");

    // Should have called DeleteCommand 4 times (removeFromMatchmaking for each)
    const deleteCalls = ddbMock.commandCalls(DeleteCommand);
    expect(deleteCalls).toHaveLength(4);
  });
});

describe("handleDrawCard", () => {
  function makeGameState(overrides?: Partial<GameState>): GameState {
    return {
      gameId: "game-1",
      phase: "playing",
      players: [
        makePlayer(0, [card("spades", 1, "s1")], "conn-0"),
        makePlayer(1, [card("hearts", 2, "h2"), card("diamonds", 5, "d5")], "conn-1"),
        makePlayer(2, [card("clubs", 3, "c3")], "conn-2"),
        makePlayer(3, [card("spades", 8, "s8")], "conn-3"),
      ],
      currentTurnIndex: 0,
      finishedCount: 0,
      version: 1,
      ...overrides,
    };
  }

  it("should send error if player is not in a game", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { connectionId: "conn-0", playerName: "Alice", gameId: null },
    });

    await handleDrawCard(ENDPOINT, "conn-0", 0);

    const messages = getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].data.type).toBe("error");
    expect(messages[0].data.message).toBe("You are not in a game");
  });

  it("should send error if it is not the player's turn", async () => {
    const game = makeGameState({ currentTurnIndex: 1 }); // Player 1's turn
    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: game };
    });

    await handleDrawCard(ENDPOINT, "conn-0", 0);

    const messages = getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].data.type).toBe("error");
    expect(messages[0].data.message).toBe("Not your turn");
  });

  it("should draw a card and broadcast result on valid turn", async () => {
    const game = makeGameState();
    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: game };
    });
    ddbMock.on(PutCommand).resolves({});

    await handleDrawCard(ENDPOINT, "conn-0", 0);

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

  it("should send error for invalid card index", async () => {
    const game = makeGameState();
    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: game };
    });

    await handleDrawCard(ENDPOINT, "conn-0", 99);

    const messages = getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].data.type).toBe("error");
    expect(messages[0].data.message).toContain("Invalid card index");
  });

  it("should send game_over when game ends", async () => {
    // Set up a scenario where drawing ends the game:
    // Only 2 active players, and drawing will leave only 1
    const game = makeGameState({
      players: [
        makePlayer(0, [card("spades", 5, "s5")], "conn-0"),
        makePlayer(1, [card("hearts", 5, "h5")], "conn-1"),
        makePlayer(2, [], "conn-2"),
        makePlayer(3, [], "conn-3"),
      ],
      currentTurnIndex: 0,
    });
    // Mark inactive players as finished
    game.players[2].finishedOrder = 1;
    game.players[3].finishedOrder = 2;
    game.finishedCount = 2;

    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: game };
    });
    ddbMock.on(PutCommand).resolves({});

    await handleDrawCard(ENDPOINT, "conn-0", 0);

    const messages = getSentMessages();
    const gameOverMsgs = messages.filter((m) => m.data.type === "game_over");
    expect(gameOverMsgs.length).toBeGreaterThanOrEqual(4);
    expect(gameOverMsgs[0].data.rankings).toBeDefined();
    expect(Array.isArray(gameOverMsgs[0].data.rankings)).toBe(true);
  });

  it("should send error if game is not active", async () => {
    const game = makeGameState({ phase: "finished" });
    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: game };
    });

    await handleDrawCard(ENDPOINT, "conn-0", 0);

    const messages = getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].data.type).toBe("error");
    expect(messages[0].data.message).toBe("Game is not active");
  });
});

describe("handleGetState", () => {
  it("should send game_state with player's own hand", async () => {
    const game: GameState = {
      gameId: "game-1",
      phase: "playing",
      players: [
        makePlayer(0, [card("spades", 1, "s1"), card("hearts", 5, "h5")], "conn-0"),
        makePlayer(1, [card("diamonds", 3, "d3")], "conn-1"),
      ],
      currentTurnIndex: 0,
      finishedCount: 0,
      version: 1,
    };

    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: game };
    });

    await handleGetState(ENDPOINT, "conn-0");

    const messages = getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].data.type).toBe("game_state");
    expect(messages[0].data.phase).toBe("playing");
    // Should include the requesting player's hand
    expect(messages[0].data.yourHand).toEqual([
      card("spades", 1, "s1"),
      card("hearts", 5, "h5"),
    ]);
    // Should include public player info
    expect(messages[0].data.players).toHaveLength(2);
    expect(messages[0].data.players[0].cardCount).toBe(2);
    expect(messages[0].data.players[1].cardCount).toBe(1);
    // Public players should NOT include hand details
    expect(messages[0].data.players[0].hand).toBeUndefined();
  });

  it("should send error if player is not in a game", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { connectionId: "conn-0", playerName: "Alice", gameId: null },
    });

    await handleGetState(ENDPOINT, "conn-0");

    const messages = getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].data.type).toBe("error");
    expect(messages[0].data.message).toBe("You are not in a game");
  });

  it("should send error if game is not found", async () => {
    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: undefined };
    });

    await handleGetState(ENDPOINT, "conn-0");

    const messages = getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].data.type).toBe("error");
    expect(messages[0].data.message).toBe("Game not found");
  });

  it("should send error if player is not in this game", async () => {
    const game: GameState = {
      gameId: "game-1",
      phase: "playing",
      players: [
        makePlayer(0, [card("spades", 1, "s1")], "other-conn"),
      ],
      currentTurnIndex: 0,
      finishedCount: 0,
      version: 1,
    };

    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.PK.startsWith("CONN#")) {
        return { Item: { connectionId: "conn-0", playerName: "Alice", gameId: "game-1" } };
      }
      return { Item: game };
    });

    await handleGetState(ENDPOINT, "conn-0");

    const messages = getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].data.type).toBe("error");
    expect(messages[0].data.message).toBe("You are not in this game");
  });
});
