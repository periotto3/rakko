import { RouletteSlot } from "./rouletteSlot.js";

const WHO_EN: Record<string, string> = {
  "Aさんが": "player A",
  "Bさんが": "player B",
  "Cさんが": "player C",
  "みんなで": "all players",
  "あなたが": "one player",
};

const WHEN_EN: Record<string, string> = {
  "社会人のとき": "as an office worker",
  "子供のとき": "as a child",
  "夏休みに": "during summer vacation",
  "深夜に": "late at night",
  "朝一で": "early in the morning",
};

const WHERE_EN: Record<string, string> = {
  "家で": "at home",
  "学校で": "at school",
  "海辺で": "by the seaside",
  "宇宙で": "in outer space",
  "森の中で": "in a forest",
};

const WHAT_EN: Record<string, string> = {
  "さみしかった話": "calm",
  "笑った話": "playful",
  "驚いた話": "bright",
  "冒険した話": "energetic",
  "食べた話": "cozy",
};

const STYLE_FLAVORS = [
  "Japanese anime style",
  "clean anime line art",
  "soft cel shading",
  "slice-of-life anime visual",
  "simple anime background art",
];

const LIGHTING_FLAVORS = [
  "soft indoor light",
  "daytime ambient light",
  "gentle diffused light",
  "warm table light",
  "warm side light",
  "natural room light",
];

const CAMERA_FLAVORS = [
  "table view",
  "balanced composition",
  "focus on faces and cards",
  "landscape framing",
  "eye-level angle",
];

const ATMOSPHERE_FLAVORS = [
  "friendly card game",
  "lively expressions",
  "lighthearted mood",
  "casual competition",
  "family-friendly tone",
];

const NEGATIVE_CONSTRAINTS =
  "avoid extra people, wrong player count, extra fingers, blurry face, text, logo, watermark, photorealistic look, revealing clothing, violence, weapons, blood";
const PROMPT_MAX_LENGTH = 320;

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function trimToLimit(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

export function buildPrompt(slots: RouletteSlot[]): string {
  const byKey = new Map(slots.map((slot) => [slot.key, slot.value]));

  const who = WHO_EN[byKey.get("who") ?? ""] ?? "Someone";
  const when = WHEN_EN[byKey.get("when") ?? ""] ?? "at some point in time";
  const where = WHERE_EN[byKey.get("where") ?? ""] ?? "in an unknown place";
  const what = WHAT_EN[byKey.get("what") ?? ""] ?? "mysterious";

  const styleFlavor = pickRandom(STYLE_FLAVORS);
  const lightingFlavor = pickRandom(LIGHTING_FLAVORS);
  const cameraFlavor = pickRandom(CAMERA_FLAVORS);
  const atmosphereFlavor = pickRandom(ATMOSPHERE_FLAVORS);

  const fixedScene =
    "Japanese anime Old Maid card game, safe and family-friendly, at a table, exactly three upper-body adult opponents, fully clothed, cards in hand";
  const visibleLayer = `${who}, ${when}, ${where}, mood ${what}`;
  const hiddenLayer = `${styleFlavor}, ${lightingFlavor}, ${cameraFlavor}, ${atmosphereFlavor}`;
  const corePrompt = `${fixedScene}, ${visibleLayer}, ${hiddenLayer}, landscape`;

  return trimToLimit(`${corePrompt}, ${NEGATIVE_CONSTRAINTS}`, PROMPT_MAX_LENGTH);
}
