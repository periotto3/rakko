import { Player } from "../player/player.js";
import { Ranking } from "./ranking.js";
import { Deck } from "../card/deck.js";
import { GamePhase } from "./gamePhase.js";

export class DrawResult {
  constructor(
    private _players: Player[],
    private _finishedCount: number,
    private _paired: boolean,
    private _newlyFinished: number[]
  ) {}

  get players() { return this._players; }
  get finishedCount() { return this._finishedCount; }
  get paired() { return this._paired; }
  get newlyFinished() { return this._newlyFinished; }
}

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

  drawCard(drawerIndex: number, targetIndex: number, cardIndex: number): DrawResult {
    const hands = this._players.map((p) => [...p.hand]);

    const targetHand = hands[targetIndex];
    const [drawnCard] = targetHand.splice(cardIndex, 1);

    const drawerHand = hands[drawerIndex];
    const pairIndex = drawerHand.findIndex(
      (c) => c.rank === drawnCard.rank && c.id !== drawnCard.id
    );

    const paired = pairIndex !== -1;

    if (paired) {
      drawerHand.splice(pairIndex, 1);
    } else {
      drawerHand.push(drawnCard);
      hands[drawerIndex] = Deck.shuffle(drawerHand);
    }

    let count = this._finishedCount;
    const newlyFinished: number[] = [];
    const finishedOrders = this._players.map((p) => p.finishedOrder);

    if (hands[targetIndex].length === 0 && finishedOrders[targetIndex] === null) {
      count++;
      finishedOrders[targetIndex] = count;
      newlyFinished.push(targetIndex);
    }

    if (hands[drawerIndex].length === 0 && finishedOrders[drawerIndex] === null) {
      count++;
      finishedOrders[drawerIndex] = count;
      newlyFinished.push(drawerIndex);
    }

    const updated = this._players.map((p, i) =>
      new Player(p.connectionId, p.name, p.avatar, p.seatIndex, hands[i], finishedOrders[i])
    );

    return new DrawResult(updated, count, paired, newlyFinished);
  }

  get isOver(): boolean {
    const activePlayers = this._players.filter(p => p.hand.length > 0).length;
    return activePlayers <= 1;
  }

  get activePlayerCount(): number {
    return this._players.filter((p) => p.hand.length > 0).length;
  }

  getNextActivePlayer(currentIndex: number): number {
    let next = (currentIndex + 1) % this._players.length;
    while (this._players[next].hand.length === 0) {
      if (next === currentIndex) return -1;
      next = (next + 1) % this._players.length;
    }
    return next;
  }

  getDrawTarget(currentIndex: number): number {
    let target = (currentIndex + 1) % this._players.length;
    while (this._players[target].hand.length === 0) {
      target = (target + 1) % this._players.length;
      if (target === currentIndex) return -1;
    }
    return target;
  }

  getRankings(): Ranking[] {
    const finished = this._players
      .filter(p => p.finishedOrder !== null)
      .sort((a, b) => a.finishedOrder! - b.finishedOrder!);

    const remaining = this._players.filter(p => p.finishedOrder === null);
    const hasJoker = (p: Player) => p.hand.some(c => c.suit === "joker");

    const nonJoker = remaining.filter(p => !hasJoker(p)).sort((a, b) => a.hand.length - b.hand.length);
    const jokerHolders = remaining.filter(p => hasJoker(p));

    const sorted = [...finished, ...nonJoker, ...jokerHolders];

    return sorted.map((p, i) =>
      new Ranking(p.seatIndex, p.name, p.avatar, i + 1)
    );
  }
}
