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
  "さみしかった話": "a story about feeling lonely",
  "笑った話": "a funny story",
  "驚いた話": "a surprising story",
  "冒険した話": "a story about an adventure",
  "食べた話": "a story about food",
};

export function buildPrompt(slots: RouletteSlot[]): string {
  const byKey = new Map(slots.map((slot) => [slot.key, slot.value]));

  const who = WHO_EN[byKey.get("who") ?? ""] ?? "Someone";
  const when = WHEN_EN[byKey.get("when") ?? ""] ?? "at some point in time";
  const where = WHERE_EN[byKey.get("where") ?? ""] ?? "in an unknown place";
  const what = WHAT_EN[byKey.get("what") ?? ""] ?? "a story";

  return `${who}, ${when}, ${where}, ${what}, pixel art style, landscape orientation`;
}
