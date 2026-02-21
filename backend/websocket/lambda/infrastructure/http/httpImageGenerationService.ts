import { ImageGenerationService } from "../../domain/model/imageGeneration/imageGenerationService.js";

const TIMEOUT_MS = 70_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Image API returned non-JSON response");
  }
}

function unwrapLambdaUrlResponse(data: unknown): unknown {
  if (!isRecord(data) || !("body" in data)) {
    return data;
  }

  const statusCode = Number(data.statusCode);
  const body = data.body;

  if (!Number.isNaN(statusCode) && statusCode >= 400) {
    const details = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`Image API returned ${statusCode}: ${details}`);
  }

  if (typeof body === "string") {
    return parseJson(body);
  }
  return body;
}

function extractImageUrls(data: unknown): string[] {
  if (!isRecord(data)) {
    return [];
  }

  if (Array.isArray(data.urls)) {
    return data.urls.filter((url): url is string => typeof url === "string");
  }

  if (Array.isArray(data.imageUrls)) {
    return data.imageUrls.filter((url): url is string => typeof url === "string");
  }

  if (Array.isArray(data.images)) {
    return data.images
      .map((item) => (isRecord(item) && typeof item.url === "string" ? item.url : null))
      .filter((url): url is string => url !== null);
  }

  return [];
}

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
      const data = parseJson(text);
      const payload = unwrapLambdaUrlResponse(data);
      const urls = extractImageUrls(payload);
      if (urls.length === 0) {
        throw new Error("Image API response did not include image URLs");
      }
      return urls;
    } finally {
      clearTimeout(timer);
    }
  }
}
