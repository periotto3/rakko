type DomainErrorType =
  | "InvalidOperation"
  | "InvalidState";

export class DomainError extends Error {
  constructor(private _type: DomainErrorType, message: string) {
    super(message);
    this.name = "DomainError";
  }

  get type() { return this._type; }
}
