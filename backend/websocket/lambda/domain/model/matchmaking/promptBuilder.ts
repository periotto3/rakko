import { RouletteSlot } from "./rouletteSlot.js";

export function buildPrompt(slots: RouletteSlot[]): string {
  return slots.map((s) => s.value).join("");
}
