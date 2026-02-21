export class WaitingPlayer {
  constructor(
    private _connectionId: string,
    private _playerName: string
  ) {}

  get connectionId() { return this._connectionId; }
  get playerName() { return this._playerName; }
}
