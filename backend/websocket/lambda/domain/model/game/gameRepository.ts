import { Game } from "./game.js";

export interface GameRepository {
  create(game: Game): Promise<void>;
  findById(gameId: string): Promise<Game | null>;
  update(game: Game): Promise<void>;
}
