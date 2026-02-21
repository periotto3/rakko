import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ConnectionRepository } from "../../domain/model/connection/connectionRepository.js";
import { Connection } from "../../domain/model/connection/connection.js";
import { DynamoDBContext } from "./dynamoDBClient.js";

const TWO_HOURS = 2 * 60 * 60;

function ttl(): number {
  return Math.floor(Date.now() / 1000) + TWO_HOURS;
}

export class ConnectionDynamoDBRepository implements ConnectionRepository {
  constructor(private ctx: DynamoDBContext) {}

  async save(connection: Connection): Promise<void> {
    await this.ctx.ddb.send(
      new PutCommand({
        TableName: this.ctx.tableName,
        Item: {
          PK: `CONN#${connection.connectionId}`,
          SK: "CONN",
          connectionId: connection.connectionId,
          playerName: connection.playerName,
          gameId: connection.gameId,
          ttl: ttl(),
        },
      })
    );
  }

  async findById(connectionId: string): Promise<Connection | null> {
    const result = await this.ctx.ddb.send(
      new GetCommand({
        TableName: this.ctx.tableName,
        Key: { PK: `CONN#${connectionId}`, SK: "CONN" },
      })
    );
    if (!result.Item) return null;
    const item = result.Item as any;
    return new Connection(item.connectionId, item.playerName, item.gameId);
  }

  async delete(connectionId: string): Promise<void> {
    await this.ctx.ddb.send(
      new DeleteCommand({
        TableName: this.ctx.tableName,
        Key: { PK: `CONN#${connectionId}`, SK: "CONN" },
      })
    );
  }

  async updateGameId(connectionId: string, gameId: string): Promise<void> {
    await this.ctx.ddb.send(
      new UpdateCommand({
        TableName: this.ctx.tableName,
        Key: { PK: `CONN#${connectionId}`, SK: "CONN" },
        UpdateExpression: "SET gameId = :g",
        ExpressionAttributeValues: { ":g": gameId },
      })
    );
  }
}
