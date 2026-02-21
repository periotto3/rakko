import { Connection } from "./connection.js";

export interface ConnectionRepository {
  save(connection: Connection): Promise<void>;
  findById(connectionId: string): Promise<Connection | null>;
  delete(connectionId: string): Promise<void>;
  updateGameId(connectionId: string, gameId: string): Promise<void>;
}
