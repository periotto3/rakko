import { ConnectionRepository } from "../../domain/model/connection/connectionRepository.js";
import { Connection } from "../../domain/model/connection/connection.js";

export class ConnectUseCase {
  constructor(private connectionRepo: ConnectionRepository) {}

  async execute(connectionId: string): Promise<void> {
    await this.connectionRepo.save(new Connection(connectionId, "", null));
  }
}
