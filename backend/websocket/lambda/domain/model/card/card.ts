export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

export class Card {
  constructor(
    private _id: string,
    private _suit: Suit | "joker",
    private _rank: number,
    private _label: string
  ) {}

  get id() { return this._id; }
  get suit() { return this._suit; }
  get rank() { return this._rank; }
  get label() { return this._label; }

  toJSON() {
    return {
      id: this._id,
      suit: this._suit,
      rank: this._rank,
      label: this._label,
    };
  }
}
