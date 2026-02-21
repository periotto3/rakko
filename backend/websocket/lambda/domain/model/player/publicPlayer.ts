export class PublicPlayer {
  constructor(
    private _name: string,
    private _avatar: string,
    private _seatIndex: number,
    private _cardCount: number,
    private _finishedOrder: number | null
  ) {}

  get name() { return this._name; }
  get avatar() { return this._avatar; }
  get seatIndex() { return this._seatIndex; }
  get cardCount() { return this._cardCount; }
  get finishedOrder() { return this._finishedOrder; }

  toJSON() {
    return {
      name: this._name,
      avatar: this._avatar,
      seatIndex: this._seatIndex,
      cardCount: this._cardCount,
      finishedOrder: this._finishedOrder,
    };
  }
}
