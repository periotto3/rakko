import { Player } from "../player/player.js";
import { GamePhase } from "./gamePhase.js";

export class Game {
  constructor(
    private _gameId: string,
    private _phase: GamePhase,
    private _players: Player[],
    private _currentTurnIndex: number,
    private _finishedCount: number,
    private _version: number
  ) {}

  get gameId() { return this._gameId; }
  get phase() { return this._phase; }
  get players() { return this._players; }
  get currentTurnIndex() { return this._currentTurnIndex; }
  get finishedCount() { return this._finishedCount; }
  get version() { return this._version; }

  applyDrawResult(players: Player[], finishedCount: number): Game {
    return new Game(
      this._gameId, this._phase, players,
      this._currentTurnIndex, finishedCount, this._version
    );
  }

  advanceTurn(nextTurnIndex: number): Game {
    return new Game(
      this._gameId, this._phase, this._players,
      nextTurnIndex, this._finishedCount, this._version + 1
    );
  }

  finish(players: Player[], finishedCount: number): Game {
    return new Game(
      this._gameId, "finished", players,
      this._currentTurnIndex, finishedCount, this._version + 1
    );
  }
}
