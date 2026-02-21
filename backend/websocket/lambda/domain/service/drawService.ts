import { Player } from "../model/player/player.js";
import { Ranking } from "../model/game/ranking.js";
import { shuffle } from "./deckService.js";

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

export function drawCard(
  players: Player[],
  drawerIndex: number,
  targetIndex: number,
  cardIndex: number,
  finishedCount: number
): DrawResult {
  // Work with local mutable copies of hands
  const hands = players.map((p) => [...p.hand]);

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
    hands[drawerIndex] = shuffle(drawerHand);
  }

  let count = finishedCount;
  const newlyFinished: number[] = [];
  const finishedOrders = players.map((p) => p.finishedOrder);

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

  // Build new Player instances from the computed state
  const updated = players.map((p, i) =>
    new Player(p.connectionId, p.name, p.avatar, p.seatIndex, hands[i], finishedOrders[i])
  );

  return new DrawResult(updated, count, paired, newlyFinished);
}

export function getNextActivePlayer(
  players: Player[],
  currentIndex: number
): number {
  let next = (currentIndex + 1) % players.length;
  while (players[next].hand.length === 0) {
    if (next === currentIndex) return -1;
    next = (next + 1) % players.length;
  }
  return next;
}

export function getDrawTarget(
  players: Player[],
  currentIndex: number
): number {
  let target = (currentIndex + 1) % players.length;
  while (players[target].hand.length === 0) {
    target = (target + 1) % players.length;
    if (target === currentIndex) return -1;
  }
  return target;
}

export function getActivePlayers(players: Player[]): number {
  return players.filter((p) => p.hand.length > 0).length;
}

export function isGameOver(players: Player[]): boolean {
  return getActivePlayers(players) <= 1;
}

export function getRankings(players: Player[]): Ranking[] {
  const sorted = [...players].sort((a, b) => {
    if (a.finishedOrder !== null && b.finishedOrder !== null) {
      return a.finishedOrder - b.finishedOrder;
    }
    if (a.finishedOrder !== null) return -1;
    if (b.finishedOrder !== null) return 1;
    return a.hand.length - b.hand.length;
  });

  return sorted.map((p, i) =>
    new Ranking(p.seatIndex, p.name, p.avatar, i + 1)
  );
}
