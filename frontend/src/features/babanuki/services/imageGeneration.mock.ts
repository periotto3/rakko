import { ThemeSlot } from "../lib/types";

// モック: 実際のAPI呼び出しは行わず、空文字を即返す
// 本実装では imageGeneration.real.ts を作成し、imageGeneration.ts の re-export 先を切り替える
export async function generateBackgroundImage(_theme: ThemeSlot): Promise<string> {
  return "";
}
