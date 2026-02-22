import { WaitingPlayer } from "./matchmaking.js";
import { RouletteSlot } from "./rouletteSlot.js";

export interface MatchmakingRepository {
  addPlayer(connectionId: string, playerName: string): Promise<void>;
  removePlayer(connectionId: string): Promise<void>;
  getWaitingPlayers(): Promise<WaitingPlayer[]>;
  getRouletteState(): Promise<RouletteSlot[]>;
  saveRouletteState(slots: RouletteSlot[], expectedSlotCount?: number): Promise<boolean>;
  deleteRouletteState(): Promise<void>;
  claimMatchedPlayers(connectionIds: string[]): Promise<boolean>;
}
