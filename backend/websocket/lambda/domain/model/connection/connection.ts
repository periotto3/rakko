export class Connection {
  constructor(
    private _connectionId: string,
    private _playerName: string,
    private _gameId: string | null
  ) {}

  get connectionId() { return this._connectionId; }
  get playerName() { return this._playerName; }
  get gameId() { return this._gameId; }
}
