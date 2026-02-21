import { RouletteSlot } from "./rouletteSlot.js";

const WHO_EN: Record<string, string> = {
  "Aさんが": "Person A",
  "Bさんが": "Person B",
  "Cさんが": "Person C",
  "みんなで": "Everyone",
  "あなたが": "You",
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
  "さみしかった話": "bittersweet",
  "笑った話": "playful",
  "驚いた話": "surprising",
  "冒険した話": "adventurous",
  "食べた話": "cozy",
};

const STYLE_FLAVORS = [
  "Japanese anime illustration, cel-shaded",
  "modern TV anime key visual",
  "manga-inspired line art with soft coloring",
  "anime movie background painting style",
  "retro 90s Japanese anime",
];

const LIGHTING_FLAVORS = [
  "golden-hour anime side light",
  "soft indoor anime ambient light",
  "low-key anime night light",
  "rainy diffused anime light",
  "matsuri-inspired festival anime light",
];

const CAMERA_FLAVORS = [
  "eye-level player view",
  "slight wide angle",
  "balanced composition",
  "focus on faces and cards",
  "landscape framing",
];

const ATMOSPHERE_FLAVORS = [
  "friendly tension with expressive anime faces",
  "lively shonen-style expressions",
  "quiet suspense like a psychological anime scene",
  "playful competition in a slice-of-life anime tone",
  "warm nostalgia like a summer anime ending scene",
];

const NEGATIVE_CONSTRAINTS =
  "avoid extra people, wrong player count, full body, extra fingers, blurry face, text, logo, watermark, photorealistic western portrait, live-action look";

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
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
    "Japanese anime Old Maid card game scene, first-person at a table, exactly three upper-body opponents across the table, all playing with cards";
  const visibleLayer = `theme: ${who}, ${when}, ${where}, mood ${what}`;
  const hiddenLayer = `${styleFlavor}, ${lightingFlavor}, ${cameraFlavor}, ${atmosphereFlavor}`;

  return `${fixedScene}, ${visibleLayer}, ${hiddenLayer}, Japanese anime, manga aesthetics, high detail, landscape, ${NEGATIVE_CONSTRAINTS}`;
}
