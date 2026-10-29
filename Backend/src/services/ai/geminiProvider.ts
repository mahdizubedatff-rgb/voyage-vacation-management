import * as z from "zod/v4";
import { assertNotBlocked, generateWithFallback, toGeminiSchema } from "./gemini";
import { AiProviderError, recommendationOutputSchema, type RecommendationProvider } from "./types";

const SYSTEM_PROMPT = `You are Voyage's travel concierge: a knowledgeable, warm travel planner for a premium vacation company.
Given a destination, produce a practical, specific recommendation for a first-time visitor.
Name real places. Keep descriptions to one or two sentences each. Do not invent prices or opening hours.
If the input is not a real place someone could travel to, set isRecognizedDestination to false and keep the other fields brief.`;

const responseJsonSchema = toGeminiSchema(z.toJSONSchema(recommendationOutputSchema));

/** Generates recommendations with Google Gemini using structured JSON output. */
export class GeminiRecommendationProvider implements RecommendationProvider {
  readonly name = "gemini";

  async recommend(destination: string) {
    const { response, model } = await generateWithFallback({
      contents: [{ role: "user", parts: [{ text: `Destination: ${destination}` }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema,
        maxOutputTokens: 8192,
      },
    });

    assertNotBlocked(response);
    if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
      throw new AiProviderError("invalid_response", "The AI service returned an incomplete recommendation");
    }

    let json: unknown;
    try {
      json = JSON.parse(response.text ?? "");
    } catch {
      throw new AiProviderError("invalid_response", "The AI service returned an invalid recommendation");
    }
    const parsed = recommendationOutputSchema.safeParse(json);
    if (!parsed.success) {
      throw new AiProviderError("invalid_response", "The AI service returned an incomplete recommendation");
    }

    const { isRecognizedDestination, ...recommendation } = parsed.data;
    return { recommendation: isRecognizedDestination ? recommendation : null, model };
  }
}
