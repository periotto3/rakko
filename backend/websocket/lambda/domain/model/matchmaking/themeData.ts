export const THEME_SLOT_KEYS = ["who", "when", "where", "what"] as const;
export type ThemeSlotKey = (typeof THEME_SLOT_KEYS)[number];

export const THEME_ITEMS: Record<ThemeSlotKey, string[]> = {
  who: ["Aさんが", "Bさんが", "Cさんが", "みんなで", "あなたが"],
  when: ["社会人のとき", "子供のとき", "夏休みに", "深夜に", "朝一で"],
  where: ["家で", "学校で", "海辺で", "宇宙で", "森の中で"],
  what: ["さみしかった話", "笑った話", "驚いた話", "冒険した話", "食べた話"],
};

export function pickRandomItem(key: ThemeSlotKey): string {
  const items = THEME_ITEMS[key];
  return items[Math.floor(Math.random() * items.length)];
}
