import { Card } from "../../domain/model/card/card.js";
import { GamePhase } from "../../domain/model/game/gamePhase.js";
import { PublicPlayer } from "../../domain/model/player/publicPlayer.js";
import { Ranking } from "../../domain/model/game/ranking.js";
import { RouletteSlot } from "../../domain/model/matchmaking/rouletteSlot.js";

export type ServerMessage =
  | {
      type: "waiting";
      waitingCount: number;
      playerNames: string[];
      decidedSlots: RouletteSlot[];
      newSlot: RouletteSlot | null;
      slotCandidates: Record<string, string[]>;
    }
  | {
      type: "game_start";
      gameId: string;
      yourSeatIndex: number;
      yourHand: Card[];
      players: PublicPlayer[];
      currentTurnSeat: number;
    }
  | {
      type: "game_state";
      phase: GamePhase;
      yourHand: Card[];
      players: PublicPlayer[];
      currentTurnSeat: number;
    }
  | {
      type: "card_drawn";
      drawerSeat: number;
      targetSeat: number;
      paired: boolean;
    }
  | { type: "game_over"; rankings: Ranking[] }
  | { type: "error"; message: string };
