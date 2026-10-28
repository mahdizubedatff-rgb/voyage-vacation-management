import * as z from "zod/v4";

export const recommendationOutputSchema = z.object({
  isRecognizedDestination: z
    .boolean()
    .describe("false if the input is not a real travel destination (gibberish, a person, an unrelated request)"),
  destination: z.string().describe("Canonical destination name, e.g. 'Kyoto, Japan'"),
  tagline: z.string().describe("One evocative sentence, max 15 words"),
  overview: z.string().describe("2-3 sentence overview of the destination"),
  bestTimeToVisit: z.string(),
  attractions: z.array(z.object({ name: z.string(), description: z.string() })).describe("4-6 must-see attractions"),
  activities: z.array(z.object({ name: z.string(), description: z.string() })).describe("4-6 suggested activities"),
  itinerary: z
    .array(z.object({ day: z.number().int(), title: z.string(), description: z.string() }))
    .describe("A 3-5 day itinerary"),
  tips: z.array(z.string()).describe("4-6 practical travel tips"),
});

export type Recommendation = Omit<z.infer<typeof recommendationOutputSchema>, "isRecognizedDestination">;

export interface RecommendationResult {
  recommendation: Recommendation;
  provider: string;
  model: string;
  generatedAt: string;
}

export interface RecommendationProvider {
  readonly name: string;
  readonly model: string;
  /** Returns null when the provider judges the input not to be a real destination. */
  recommend(destination: string): Promise<Recommendation | null>;
}

/** Failure categories mapped to HTTP status codes by the service. */
export class AiProviderError extends Error {
  constructor(
    public readonly kind: "not_configured" | "auth" | "rate_limit" | "unavailable" | "invalid_response" | "refused",
    message: string,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}
