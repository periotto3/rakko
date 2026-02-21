import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { GameState } from "./types";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.TABLE_NAME!;

const TWO_HOURS = 2 * 60 * 60;

function ttl(): number {
  return Math.floor(Date.now() / 1000) + TWO_HOURS;
}

// --- Connection management ---

export async function saveConnection(
  connectionId: string,
  playerName: string
): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `CONN#${connectionId}`,
        SK: "CONN",
        connectionId,
        playerName,
        gameId: null,
        ttl: ttl(),
      },
    })
  );
}

export async function deleteConnection(connectionId: string): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `CONN#${connectionId}`, SK: "CONN" },
    })
  );
}

export async function getConnection(
  connectionId: string
): Promise<{ connectionId: string; playerName: string; gameId: string | null } | null> {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `CONN#${connectionId}`, SK: "CONN" },
    })
  );
  return (result.Item as any) ?? null;
}

export async function setConnectionGameId(
  connectionId: string,
  gameId: string
): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `CONN#${connectionId}`, SK: "CONN" },
      UpdateExpression: "SET gameId = :g",
      ExpressionAttributeValues: { ":g": gameId },
    })
  );
}

// --- Matchmaking ---

export async function addToMatchmaking(
  connectionId: string,
  playerName: string
): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: "MATCHMAKING",
        SK: `CONN#${connectionId}`,
        connectionId,
        playerName,
        ttl: ttl(),
      },
    })
  );
}

export async function removeFromMatchmaking(
  connectionId: string
): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: "MATCHMAKING", SK: `CONN#${connectionId}` },
    })
  );
}

export async function getWaitingPlayers(): Promise<
  { connectionId: string; playerName: string }[]
> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": "MATCHMAKING" },
    })
  );
  return (result.Items ?? []) as any[];
}

// --- Game state ---

export async function createGame(game: GameState): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `GAME#${game.gameId}`,
        SK: "META",
        ...game,
        ttl: ttl(),
      },
    })
  );
}

export async function getGame(gameId: string): Promise<GameState | null> {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `GAME#${gameId}`, SK: "META" },
    })
  );
  return (result.Item as GameState) ?? null;
}

export async function updateGame(game: GameState): Promise<void> {
  const previousVersion = game.version - 1;
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `GAME#${game.gameId}`,
        SK: "META",
        ...game,
        ttl: ttl(),
      },
      ConditionExpression: "version = :v",
      ExpressionAttributeValues: { ":v": previousVersion },
    })
  );
}
