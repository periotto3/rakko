import { GameMode } from "../lib/types";
import { GameService } from "./gameService";
import { CpuGameService } from "./cpuGameService";
import { OnlineGameService } from "./onlineGameService";

export function createGameService(mode: GameMode): GameService {
  return mode === "online" ? new OnlineGameService() : new CpuGameService();
}
