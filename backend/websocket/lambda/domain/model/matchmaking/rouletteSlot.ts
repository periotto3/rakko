export class RouletteSlot {
  constructor(
    private _key: string,
    private _value: string,
    private _slotIndex: number
  ) {}

  get key() { return this._key; }
  get value() { return this._value; }
  get slotIndex() { return this._slotIndex; }

  toJSON() {
    return {
      key: this._key,
      value: this._value,
      slotIndex: this._slotIndex,
    };
  }
}
