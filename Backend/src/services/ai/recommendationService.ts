import { env, isAiConfigured } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { AnthropicRecommendationProvider } from "./anthropicProvider";
import { AiProviderError, type RecommendationProvider, type RecommendationResult } from "./types";

let providerOverride: RecommendationProvider | null | undefined;
let cachedProvider: RecommendationProvider | null | undefined;

/** Test hook: inject a mock provider (or null to simulate "not configured"). Pass undefined to reset. */
export function setRecommendationProvider(provider: RecommendationProvider | null | undefined): void {
  providerOverride = provider;
}

function getProvider(): RecommendationProvider | null {
  if (providerOverride !== undefined) return providerOverride;
  if (cachedProvider === undefined) {
    cachedProvider = isAiConfigured()
      ? new AnthropicRecommendationProvider(env.ANTHROPIC_API_KEY as string, env.AI_MODEL, env.AI_TIMEOUT_MS)
      : null;
  }
  return cachedProvider;
}

const STATUS_BY_KIND: Record<AiProviderError["kind"], number> = {
  not_configured: 503,
  auth: 502,
  rate_limit: 429,
  unavailable: 503,
  invalid_response: 502,
  refused: 422,
};

export async function getRecommendation(destination: string): Promise<RecommendationResult> {
  const provider = getProvider();
  if (!provider) {
    throw new AppError(
      503,
      "AI recommendations are not configured on this server. An administrator must set ANTHROPIC_API_KEY.",
      undefined,
      "AI_NOT_CONFIGURED",
    );
  }

  try {
    const recommendation = await provider.recommend(destination);
    if (!recommendation) {
      throw new AppError(422, `We couldn't recognise "${destination}" as a travel destination. Try a city or country.`);
    }
    return { recommendation, provider: provider.name, model: provider.model, generatedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof AiProviderError) {
      throw new AppError(STATUS_BY_KIND[error.kind], error.message, undefined, `AI_${error.kind.toUpperCase()}`);
    }
    throw error;
  }
}
