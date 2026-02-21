import { ImageGenerationService } from "../../domain/model/imageGeneration/imageGenerationService.js";

const TIMEOUT_MS = 70_000;

export class HttpImageGenerationService implements ImageGenerationService {
  constructor(private readonly apiUrl: string) {}

  async generate(prompt: string, roomId: string): Promise<string[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, roomId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Image API returned ${response.status}`);
      }

      const text = await response.text();
      const data = JSON.parse(text);
      return data.urls ?? data.imageUrls ?? [];
    } finally {
      clearTimeout(timer);
    }
  }
}
