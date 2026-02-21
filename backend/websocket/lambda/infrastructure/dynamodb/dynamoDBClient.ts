import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export interface DynamoDBContext {
  ddb: DynamoDBDocumentClient;
  tableName: string;
}

export function createDynamoDBClient(): DynamoDBContext {
  const client = new DynamoDBClient({});
  const ddb = DynamoDBDocumentClient.from(client);
  const tableName = process.env.TABLE_NAME!;
  return { ddb, tableName };
}
