type ApplicationErrorType =
  | "NOT_IN_GAME"
  | "GAME_NOT_ACTIVE"
  | "NOT_YOUR_TURN"
  | "INVALID_CARD_INDEX"
  | "NO_DRAW_TARGET"
  | "PLAYER_NOT_FOUND";

export class ApplicationError extends Error {
  constructor(private _type: ApplicationErrorType, message: string) {
    super(message);
    this.name = "ApplicationError";
  }

  get type() { return this._type; }
}
