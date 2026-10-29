import { ApiError, GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import { env } from "../../config/env";
import { AiProviderError } from "./types";

/** The part of the Google GenAI client this app uses (lets tests inject a fake). */
export interface GeminiClient {
  models: { generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse> };
}

let clientOverride: GeminiClient | undefined;
let cachedClient: GeminiClient | undefined;

/** Test hook: replace the Gemini client. Pass undefined to restore the real one. */
export function setGeminiClient(client: GeminiClient | undefined): void {
  clientOverride = client;
}

export function getGeminiClient(): GeminiClient {
  if (clientOverride) return clientOverride;
  cachedClient ??= new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    httpOptions: { timeout: env.AI_TIMEOUT_MS },
  });
  return cachedClient;
}

/** Maps SDK/network failures to provider-neutral error kinds. Never includes the API key or raw request. */
export function mapGeminiError(error: unknown): AiProviderError {
  if (error instanceof AiProviderError) return error;
  if (error instanceof ApiError) {
    const message = error.message ?? "";
    if (error.status === 401 || error.status === 403 || /api key/i.test(message)) {
      return new AiProviderError("auth", "The AI provider rejected the configured API key");
    }
    if (error.status === 429) {
      return new AiProviderError("rate_limit", "The AI service is busy or the free-tier quota is used up. Please try again in a minute.");
    }
    if (error.status === 404 || (error.status === 400 && /model/i.test(message))) {
      return new AiProviderError("model_unavailable", "The configured AI model is not available");
    }
    if (error.status >= 500) {
      return new AiProviderError("unavailable", "The AI service is temporarily unavailable. Please try again later.");
    }
    return new AiProviderError("invalid_response", "The AI service could not process the request");
  }
  const name = (error as { name?: string } | null)?.name ?? "";
  if (name === "AbortError" || name === "TimeoutError" || /timed? ?out/i.test(String((error as Error)?.message))) {
    return new AiProviderError("unavailable", "The AI service took too long to respond. Please try again.");
  }
  if (error instanceof TypeError) {
    // fetch() network failures surface as TypeError ("fetch failed").
    return new AiProviderError("unavailable", "Could not reach the AI service. Please try again later.");
  }
  return new AiProviderError("invalid_response", "The AI service returned an unexpected response");
}

/** Throws when Gemini blocked the prompt or stopped for safety reasons. */
export function assertNotBlocked(response: GenerateContentResponse): void {
  const finishReason = response.candidates?.[0]?.finishReason;
  if (response.promptFeedback?.blockReason || ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"].includes(String(finishReason))) {
    throw new AiProviderError("refused", "The AI service declined to answer this request");
  }
}

/**
 * Calls generateContent on GEMINI_MODEL, falling back to GEMINI_FALLBACK_MODEL when the
 * primary model is unavailable for this key. Returns the response and the model that answered.
 */
export async function generateWithFallback(
  params: Omit<GenerateContentParameters, "model">,
): Promise<{ response: GenerateContentResponse; model: string }> {
  const models = [env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL.trim()].filter((m, i, all) => m && all.indexOf(m) === i);
  let lastError: AiProviderError | undefined;
  for (const model of models) {
    try {
      const response = await getGeminiClient().models.generateContent({ ...params, model });
      return { response, model };
    } catch (error) {
      lastError = mapGeminiError(error);
      if (lastError.kind !== "model_unavailable") throw lastError;
    }
  }
  throw lastError ?? new AiProviderError("model_unavailable", "No AI model is configured");
}

/** Strips JSON Schema keys Gemini does not accept in function/response schemas. */
export function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (schema && typeof schema === "object") {
    return Object.fromEntries(
      Object.entries(schema as Record<string, unknown>)
        .filter(([key]) => key !== "$schema")
        .map(([key, value]) => [key, toGeminiSchema(value)]),
    );
  }
  return schema;
}
