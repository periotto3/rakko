import { ImageGenerationService } from "../../domain/model/imageGeneration/imageGenerationService.js";

const TIMEOUT_MS = 70_000;
const ERROR_BODY_LOG_LIMIT = 500;
const MAX_RETRIES = 3;

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

function summarizeText(text: string, limit = ERROR_BODY_LOG_LIMIT): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) {
    return compact;
  }
  return `${compact.slice(0, limit)}...`;
}

function classifyHttp400(responseBody: string): "policy_blocked" | "other_400" {
  const normalized = responseBody.toLowerCase();
  if (
    normalized.includes("responsible ai policy") ||
    normalized.includes("has been blocked") ||
    normalized.includes("filtered from the response")
  ) {
    return "policy_blocked";
  }
  return "other_400";
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
  // Response is an array of objects (e.g. [{backgroundUrl: "..."}])
  if (Array.isArray(data)) {
    const urls = data
      .filter(isRecord)
      .map((item) => item.backgroundUrl ?? item.url)
      .filter((url): url is string => typeof url === "string");
    if (urls.length > 0) return urls;
  }

  if (!isRecord(data)) {
    return [];
  }

  if (typeof data.backgroundUrl === "string") {
    return [data.backgroundUrl];
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

  private async requestImage(prompt: string, roomId: string): Promise<string[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const startedAt = Date.now();

    console.info(
      JSON.stringify({
        event: "image_api_request_start",
        roomId,
        timeoutMs: TIMEOUT_MS,
        promptLength: prompt.length,
      })
    );

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, roomId }),
        signal: controller.signal,
      });
      const text = await response.text();

      console.info(
        JSON.stringify({
          event: "image_api_http_response",
          roomId,
          status: response.status,
          elapsedMs: Date.now() - startedAt,
        })
      );

      if (!response.ok) {
        const responseBody = summarizeText(text);
        const errorType =
          response.status === 400 ? classifyHttp400(responseBody) : "http_error";
        console.error(
          JSON.stringify({
            event: "image_api_http_error_body",
            roomId,
            status: response.status,
            errorType,
            responseBody,
          })
        );
        throw new Error(`Image API returned ${response.status}: ${responseBody}`);
      }

      const data = parseJson(text);
      const payload = unwrapLambdaUrlResponse(data);
      const urls = extractImageUrls(payload);
      if (urls.length === 0) {
        console.error(
          JSON.stringify({
            event: "image_api_unexpected_response",
            roomId,
            rawResponsePreview: summarizeText(text, 1000),
            payloadKeys: isRecord(payload) ? Object.keys(payload) : typeof payload,
          })
        );
        throw new Error("Image API response did not include image URLs");
      }
      console.info(
        JSON.stringify({
          event: "image_api_request_success",
          roomId,
          urlCount: urls.length,
          elapsedMs: Date.now() - startedAt,
        })
      );
      return urls;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isTimeout =
        err instanceof Error &&
        (err.name === "AbortError" || errorMessage.toLowerCase().includes("aborted"));
      console.error(
        JSON.stringify({
          event: "image_api_request_failed",
          roomId,
          elapsedMs: Date.now() - startedAt,
          isTimeout,
          errorMessage,
          endpoint: this.apiUrl,
        })
      );
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async generate(prompt: string, roomId: string): Promise<string[]> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.requestImage(prompt, roomId);
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          console.warn(
            JSON.stringify({
              event: "image_api_retry",
              roomId,
              attempt,
              maxRetries: MAX_RETRIES,
              errorMessage: err instanceof Error ? err.message : String(err),
            })
          );
        }
      }
    }
    throw lastError;
  }
}
