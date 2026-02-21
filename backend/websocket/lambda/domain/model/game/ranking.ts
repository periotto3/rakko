export class Ranking {
  constructor(
    private _seatIndex: number,
    private _name: string,
    private _avatar: string,
    private _rank: number
  ) {}

  get seatIndex() { return this._seatIndex; }
  get name() { return this._name; }
  get avatar() { return this._avatar; }
  get rank() { return this._rank; }

  toJSON() {
    return {
      seatIndex: this._seatIndex,
      name: this._name,
      avatar: this._avatar,
      rank: this._rank,
    };
  }
}
