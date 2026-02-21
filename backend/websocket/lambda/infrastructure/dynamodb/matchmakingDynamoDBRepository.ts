import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { MatchmakingRepository } from "../../domain/model/matchmaking/matchmakingRepository.js";
import { WaitingPlayer } from "../../domain/model/matchmaking/matchmaking.js";
import { RouletteSlot } from "../../domain/model/matchmaking/rouletteSlot.js";
import { DynamoDBContext } from "./dynamoDBClient.js";

const TWO_HOURS = 2 * 60 * 60;

function ttl(): number {
  return Math.floor(Date.now() / 1000) + TWO_HOURS;
}

export class MatchmakingDynamoDBRepository implements MatchmakingRepository {
  constructor(private ctx: DynamoDBContext) {}

  async addPlayer(connectionId: string, playerName: string): Promise<void> {
    await this.ctx.ddb.send(
      new PutCommand({
        TableName: this.ctx.tableName,
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

  async removePlayer(connectionId: string): Promise<void> {
    await this.ctx.ddb.send(
      new DeleteCommand({
        TableName: this.ctx.tableName,
        Key: { PK: "MATCHMAKING", SK: `CONN#${connectionId}` },
      })
    );
  }

  async getWaitingPlayers(): Promise<WaitingPlayer[]> {
    const result = await this.ctx.ddb.send(
      new QueryCommand({
        TableName: this.ctx.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :conn)",
        ExpressionAttributeValues: { ":pk": "MATCHMAKING", ":conn": "CONN#" },
      })
    );
    return (result.Items ?? []).map(
      (item: any) => new WaitingPlayer(item.connectionId, item.playerName)
    );
  }

  async getRouletteState(): Promise<RouletteSlot[]> {
    const result = await this.ctx.ddb.send(
      new GetCommand({
        TableName: this.ctx.tableName,
        Key: { PK: "MATCHMAKING", SK: "ROULETTE" },
      })
    );
    const slots = (result.Item as any)?.slots ?? [];
    return slots.map(
      (s: any) => new RouletteSlot(s.key, s.value, s.slotIndex)
    );
  }

  async saveRouletteState(slots: RouletteSlot[]): Promise<void> {
    await this.ctx.ddb.send(
      new PutCommand({
        TableName: this.ctx.tableName,
        Item: {
          PK: "MATCHMAKING",
          SK: "ROULETTE",
          slots: slots.map((s) => ({
            key: s.key,
            value: s.value,
            slotIndex: s.slotIndex,
          })),
          ttl: ttl(),
        },
      })
    );
  }

  async deleteRouletteState(): Promise<void> {
    await this.ctx.ddb.send(
      new DeleteCommand({
        TableName: this.ctx.tableName,
        Key: { PK: "MATCHMAKING", SK: "ROULETTE" },
      })
    );
  }
}
