import { GameState, Player, CPUPersonality } from "./types";
import { createResourcePool, drawResources } from "./resources";
import { decideCPUDiscard, decideCPUBuildSelection } from "./cpuStrategy";

const HAND_SIZE = 7;

const CPU_PLAYERS: { name: string; personality: CPUPersonality; avatar: string }[] = [
  { name: "Sakura", personality: "serverless-fan", avatar: "🌸" },
  { name: "Hinata", personality: "traditional", avatar: "☀️" },
  { name: "Kaede", personality: "balanced", avatar: "🍁" },
];

function createPlayer(
  id: string,
  name: string,
  isCPU: boolean,
  avatar: string
): Player {
  return {
    id,
    name,
    isCPU,
    hand: [],
    selectedResources: [],
    isReady: false,
    avatar,
    hasDiscarded: false,
    hasSubmitted: false,
    totalScore: 0,
  };
}

export function createInitialState(): GameState {
  return {
    players: [createPlayer("player", "あなた", false, "🎮")],
    resourcePool: [],
    discardPile: [],
    currentPlayerIndex: 0,
    phase: "idle",
    round: 0,
    maxRounds: 1,
  };
}

export function setupLobby(state: GameState): GameState {
  const players = [
    state.players[0],
    ...CPU_PLAYERS.map((cpu, i) =>
      createPlayer(`cpu-${i}`, cpu.name, true, cpu.avatar)
    ),
  ];

  return { ...state, players, phase: "lobby" };
}

export function toggleReady(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, isReady: !p.isReady } : p
    ),
  };
}

export function allReady(state: GameState): boolean {
  return state.players.length >= 2 && state.players.every((p) => p.isReady);
}

export function startGame(state: GameState): GameState {
  const pool = createResourcePool();

  // 各プレイヤーに7枚配布
  let remainingPool = [...pool];
  const players = state.players.map((p) => {
    const { drawn, remaining } = drawResources(remainingPool, HAND_SIZE);
    remainingPool = remaining;
    return {
      ...p,
      hand: drawn,
      selectedResources: [],
      hasDiscarded: false,
      hasSubmitted: false,
      evaluation: undefined,
    };
  });

  return {
    ...state,
    players,
    resourcePool: remainingPool,
    discardPile: [],
    phase: "drafting",
    round: 1,
    maxRounds: 5,
  };
}

export function applyDiscard(
  state: GameState,
  playerId: string,
  discardIndices: number[]
): GameState {
  const discardSet = new Set(discardIndices);
  const discardCount = discardSet.size;

  // 捨てた分だけプールから補充
  let pool = [...state.resourcePool];
  const { drawn, remaining } = drawResources(pool, discardCount);
  pool = remaining;

  const players = state.players.map((p) => {
    if (p.id !== playerId) return p;
    const hand = p.hand.filter((_, i) => !discardSet.has(i));
    return { ...p, hand: [...hand, ...drawn], hasDiscarded: true };
  });

  const discardedPlayer = state.players.find((p) => p.id === playerId);
  const discardedCards = discardedPlayer
    ? discardedPlayer.hand.filter((_, i) => discardSet.has(i))
    : [];
  const discardPile = [...state.discardPile, ...discardedCards];

  const newState = { ...state, players, resourcePool: pool, discardPile };

  // 全員がdiscard済みなら構築フェーズへ
  if (newState.players.every((p) => p.hasDiscarded)) {
    return { ...newState, phase: "building" };
  }

  return newState;
}

export function applyCPUDiscards(state: GameState): GameState {
  let currentState = state;

  for (const player of currentState.players) {
    if (!player.isCPU || player.hasDiscarded) continue;

    const personality = CPU_PLAYERS.find(
      (c) => `cpu-${CPU_PLAYERS.indexOf(c)}` === player.id
    )?.personality ?? "balanced";

    const discardIndices = decideCPUDiscard(player.hand, personality);
    currentState = applyDiscard(currentState, player.id, discardIndices);
  }

  return currentState;
}

export function submitArchitecture(
  state: GameState,
  playerId: string,
  resourceIds: string[]
): GameState {
  const players = state.players.map((p) => {
    if (p.id !== playerId) return p;
    const selected = p.hand.filter((r) => resourceIds.includes(r.id));
    return { ...p, selectedResources: selected, hasSubmitted: true };
  });

  const newState = { ...state, players };

  if (newState.players.every((p) => p.hasSubmitted)) {
    return { ...newState, phase: "evaluating" };
  }

  return newState;
}

export function applyCPUSubmissions(state: GameState): GameState {
  let currentState = state;

  for (const player of currentState.players) {
    if (!player.isCPU || player.hasSubmitted) continue;

    const personality = CPU_PLAYERS.find(
      (c) => `cpu-${CPU_PLAYERS.indexOf(c)}` === player.id
    )?.personality ?? "balanced";

    const selected = decideCPUBuildSelection(player.hand, personality);
    currentState = submitArchitecture(
      currentState,
      player.id,
      selected.map((r) => r.id)
    );
  }

  return currentState;
}

export function applyEvaluations(
  state: GameState,
  results: Record<string, { score: number; grade: string; title: string; feedback: string; strengths: string[]; weaknesses: string[] }>
): GameState {
  const players = state.players.map((p) => {
    const roundEval = results[p.id];
    if (!roundEval) return p;
    return {
      ...p,
      evaluation: {
        ...roundEval,
        grade: roundEval.grade as "S" | "A" | "B" | "C" | "D",
      },
      totalScore: p.totalScore + roundEval.score,
    };
  });

  const isFinalRound = state.round >= state.maxRounds;
  return { ...state, players, phase: isFinalRound ? "result" : "roundResult" };
}

export function startNextRound(state: GameState): GameState {
  const pool = createResourcePool();

  let remainingPool = [...pool];
  const players = state.players.map((p) => {
    const { drawn, remaining } = drawResources(remainingPool, HAND_SIZE);
    remainingPool = remaining;
    return {
      ...p,
      hand: drawn,
      selectedResources: [],
      hasDiscarded: false,
      hasSubmitted: false,
      evaluation: undefined,
    };
  });

  return {
    ...state,
    players,
    resourcePool: remainingPool,
    discardPile: [],
    phase: "drafting",
    round: state.round + 1,
  };
}

export function getCPUPersonality(playerId: string): CPUPersonality {
  const index = CPU_PLAYERS.findIndex(
    (_, i) => `cpu-${i}` === playerId
  );
  return CPU_PLAYERS[index]?.personality ?? "balanced";
}
