import { Card } from "../card/card.js";

export class Player {
  constructor(
    private _connectionId: string,
    private _name: string,
    private _avatar: string,
    private _seatIndex: number,
    private _hand: Card[],
    private _finishedOrder: number | null
  ) {}

  get connectionId() { return this._connectionId; }
  get name() { return this._name; }
  get avatar() { return this._avatar; }
  get seatIndex() { return this._seatIndex; }
  get hand() { return this._hand; }
  get finishedOrder() { return this._finishedOrder; }

  withFinishedOrder(order: number): Player {
    return new Player(
      this._connectionId, this._name, this._avatar,
      this._seatIndex, this._hand, order
    );
  }
}
