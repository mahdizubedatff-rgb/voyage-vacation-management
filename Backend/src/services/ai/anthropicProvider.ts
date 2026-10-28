import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AiProviderError, recommendationOutputSchema, type Recommendation, type RecommendationProvider } from "./types";

const SYSTEM_PROMPT = `You are Voyage's travel concierge: a knowledgeable, warm travel planner for a premium vacation company.
Given a destination, produce a practical, specific recommendation for a first-time visitor.
Name real places. Keep descriptions to one or two sentences each. Do not invent prices or opening hours.
If the input is not a real place someone could travel to, set isRecognizedDestination to false and leave the other fields brief.`;

/** Maps Anthropic SDK errors to provider-neutral error kinds. */
export function mapAnthropicError(error: unknown): AiProviderError {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new AiProviderError("auth", "The AI provider rejected the configured API key");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AiProviderError("rate_limit", "The AI service is busy right now. Please try again in a minute.");
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AiProviderError("unavailable", "Could not reach the AI service. Please try again later.");
  }
  if (error instanceof Anthropic.APIError) {
    return new AiProviderError("unavailable", "The AI service returned an error. Please try again later.");
  }
  if (error instanceof AiProviderError) return error;
  return new AiProviderError("invalid_response", "The AI service returned an unexpected response");
}

export class AnthropicRecommendationProvider implements RecommendationProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
    timeoutMs: number,
  ) {
    this.client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 2 });
  }

  async recommend(destination: string): Promise<Recommendation | null> {
    try {
      const response = await this.client.messages.parse({
        model: this.model,
        max_tokens: 16000,
        output_config: { effort: "low", format: zodOutputFormat(recommendationOutputSchema) },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Destination: ${destination}` }],
      });

      if (response.stop_reason === "refusal") {
        throw new AiProviderError("refused", "The AI service declined to answer this request");
      }
      if (response.stop_reason === "max_tokens" || !response.parsed_output) {
        throw new AiProviderError("invalid_response", "The AI service returned an incomplete recommendation");
      }

      const { isRecognizedDestination, ...recommendation } = response.parsed_output;
      return isRecognizedDestination ? recommendation : null;
    } catch (error) {
      throw mapAnthropicError(error);
    }
  }
}
