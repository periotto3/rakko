import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { GameRepository } from "../../domain/model/game/gameRepository.js";
import { Game } from "../../domain/model/game/game.js";
import { Player } from "../../domain/model/player/player.js";
import { Card } from "../../domain/model/card/card.js";
import { DynamoDBContext } from "./dynamoDBClient.js";

const TWO_HOURS = 2 * 60 * 60;

function ttl(): number {
  return Math.floor(Date.now() / 1000) + TWO_HOURS;
}

function gameToRecord(game: Game) {
  return {
    gameId: game.gameId,
    phase: game.phase,
    players: game.players.map((p) => ({
      connectionId: p.connectionId,
      name: p.name,
      avatar: p.avatar,
      seatIndex: p.seatIndex,
      hand: p.hand.map((c) => ({
        id: c.id,
        suit: c.suit,
        rank: c.rank,
        label: c.label,
      })),
      finishedOrder: p.finishedOrder,
    })),
    currentTurnIndex: game.currentTurnIndex,
    finishedCount: game.finishedCount,
    version: game.version,
  };
}

function recordToGame(item: any): Game {
  const players = (item.players as any[]).map(
    (p: any) =>
      new Player(
        p.connectionId,
        p.name,
        p.avatar,
        p.seatIndex,
        (p.hand as any[]).map(
          (c: any) => new Card(c.id, c.suit, c.rank, c.label)
        ),
        p.finishedOrder
      )
  );
  return new Game(
    item.gameId,
    item.phase,
    players,
    item.currentTurnIndex,
    item.finishedCount,
    item.version
  );
}

export class GameDynamoDBRepository implements GameRepository {
  constructor(private ctx: DynamoDBContext) {}

  async create(game: Game): Promise<void> {
    await this.ctx.ddb.send(
      new PutCommand({
        TableName: this.ctx.tableName,
        Item: {
          PK: `GAME#${game.gameId}`,
          SK: "META",
          ...gameToRecord(game),
          ttl: ttl(),
        },
      })
    );
  }

  async findById(gameId: string): Promise<Game | null> {
    const result = await this.ctx.ddb.send(
      new GetCommand({
        TableName: this.ctx.tableName,
        Key: { PK: `GAME#${gameId}`, SK: "META" },
      })
    );
    if (!result.Item) return null;
    return recordToGame(result.Item);
  }

  async update(game: Game): Promise<void> {
    const previousVersion = game.version - 1;
    await this.ctx.ddb.send(
      new PutCommand({
        TableName: this.ctx.tableName,
        Item: {
          PK: `GAME#${game.gameId}`,
          SK: "META",
          ...gameToRecord(game),
          ttl: ttl(),
        },
        ConditionExpression: "version = :v",
        ExpressionAttributeValues: { ":v": previousVersion },
      })
    );
  }
}
