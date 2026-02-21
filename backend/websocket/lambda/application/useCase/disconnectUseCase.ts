import { ConnectionRepository } from "../../domain/model/connection/connectionRepository.js";
import { MatchmakingRepository } from "../../domain/model/matchmaking/matchmakingRepository.js";

export class DisconnectUseCase {
  constructor(
    private connectionRepo: ConnectionRepository,
    private matchmakingRepo: MatchmakingRepository
  ) {}

  async execute(connectionId: string): Promise<void> {
    await this.matchmakingRepo.removePlayer(connectionId);
    await this.connectionRepo.delete(connectionId);

    const remaining = await this.matchmakingRepo.getWaitingPlayers();
    if (remaining.length === 0) {
      await this.matchmakingRepo.deleteRouletteState();
    }
  }
}
