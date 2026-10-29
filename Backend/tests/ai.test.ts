import { ApiError, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { mapGeminiError, setGeminiClient } from "../src/services/ai/gemini";
import { GeminiRecommendationProvider } from "../src/services/ai/geminiProvider";
import { setRecommendationProvider } from "../src/services/ai/recommendationService";
import { AiProviderError, type Recommendation, type RecommendationProvider } from "../src/services/ai/types";
import { api, createUser, startDatabase, stopDatabase } from "./helpers";

beforeAll(startDatabase);
afterAll(stopDatabase);
afterEach(() => {
  setRecommendationProvider(undefined);
  setGeminiClient(undefined);
});

const MOCK: Recommendation = {
  destination: "Kyoto, Japan",
  tagline: "Temples, tea and timeless gardens.",
  overview: "Japan's former imperial capital.",
  bestTimeToVisit: "Spring and autumn",
  attractions: [{ name: "Fushimi Inari", description: "Thousands of torii gates." }],
  activities: [{ name: "Tea ceremony", description: "In a machiya townhouse." }],
  itinerary: [{ day: 1, title: "Higashiyama", description: "Kiyomizu-dera and Gion." }],
  tips: ["Buy an ICOCA card."],
};

const provider = (impl: RecommendationProvider["recommend"]): RecommendationProvider => ({ name: "mock", recommend: impl });

async function ask(destination = "Kyoto") {
  const { token } = await createUser("USER");
  return api().post("/api/ai/recommendations").set("Authorization", `Bearer ${token}`).send({ destination });
}

/** A fake Gemini client: each call returns the next scripted response (or throws it). */
function fakeGemini(script: Array<Partial<GenerateContentResponse> | Error>) {
  const calls: GenerateContentParameters[] = [];
  setGeminiClient({
    models: {
      generateContent: async (params) => {
        calls.push(params);
        const next = script.shift();
        if (!next) throw new Error("unexpected Gemini call");
        if (next instanceof Error) throw next;
        return next as GenerateContentResponse;
      },
    },
  });
  return calls;
}

const jsonResponse = (body: unknown, finishReason = "STOP"): Partial<GenerateContentResponse> =>
  ({ text: JSON.stringify(body), candidates: [{ finishReason }] }) as unknown as Partial<GenerateContentResponse>;

describe("POST /api/ai/recommendations (mocked provider)", () => {
  it("returns the structured recommendation from the provider", async () => {
    let received = "";
    setRecommendationProvider(provider(async (destination) => ((received = destination), { recommendation: MOCK, model: "mock-model" })));
    const res = await ask("  Kyoto  ");
    expect(res.status).toBe(200);
    expect(received).toBe("Kyoto");
    expect(res.body.data).toMatchObject({ recommendation: MOCK, provider: "mock", model: "mock-model" });
  });

  it("reports a missing API key as 503 instead of faking an answer", async () => {
    setRecommendationProvider(null);
    const res = await ask();
    expect(res.status).toBe(503);
    expect(res.body.error.message).toMatch(/GEMINI_API_KEY/);
  });

  it("returns 422 when the provider does not recognise the destination", async () => {
    setRecommendationProvider(provider(async () => ({ recommendation: null, model: "m" })));
    expect((await ask("asdfgh")).status).toBe(422);
  });

  it.each([
    ["rate_limit", 429],
    ["unavailable", 503],
    ["model_unavailable", 503],
    ["invalid_response", 502],
    ["auth", 502],
    ["refused", 422],
  ] as const)("maps provider error %s to HTTP %i", async (kind, status) => {
    setRecommendationProvider(
      provider(async () => {
        throw new AiProviderError(kind, "boom");
      }),
    );
    expect((await ask()).status).toBe(status);
  });

  it("validates input and enforces the USER role", async () => {
    setRecommendationProvider(provider(async () => ({ recommendation: MOCK, model: "m" })));
    expect((await ask("")).status).toBe(400);
    const admin = await createUser("ADMIN");
    const res = await api().post("/api/ai/recommendations").set("Authorization", `Bearer ${admin.token}`).send({ destination: "Rome" });
    expect(res.status).toBe(403);
    expect((await api().post("/api/ai/recommendations").send({ destination: "Rome" })).status).toBe(401);
  });
});

describe("GeminiRecommendationProvider (mocked Gemini SDK responses)", () => {
  it("requests JSON output with a schema and parses the response", async () => {
    const calls = fakeGemini([jsonResponse({ isRecognizedDestination: true, ...MOCK })]);
    const result = await new GeminiRecommendationProvider().recommend("Kyoto");
    expect(result).toEqual({ recommendation: MOCK, model: "gemini-3.1-flash-lite" });
    expect(calls[0]?.model).toBe("gemini-3.1-flash-lite");
    expect(calls[0]?.config?.responseMimeType).toBe("application/json");
    expect(JSON.stringify(calls[0]?.config?.responseJsonSchema)).toContain("itinerary");
    expect(JSON.stringify(calls[0]?.config?.responseJsonSchema)).not.toContain("$schema");
  });

  it("returns null for unrecognised destinations", async () => {
    fakeGemini([jsonResponse({ isRecognizedDestination: false, ...MOCK })]);
    expect((await new GeminiRecommendationProvider().recommend("asdf")).recommendation).toBeNull();
  });

  it("falls back to GEMINI_FALLBACK_MODEL when the primary model is unavailable", async () => {
    const calls = fakeGemini([
      new ApiError({ message: "models/gemini-3.1-flash-lite is not found", status: 404 }),
      jsonResponse({ isRecognizedDestination: true, ...MOCK }),
    ]);
    const result = await new GeminiRecommendationProvider().recommend("Kyoto");
    expect(calls.map((call) => call.model)).toEqual(["gemini-3.1-flash-lite", "gemini-3.6-flash"]);
    expect(result.model).toBe("gemini-3.6-flash");
  });

  it("falls back when the primary model times out on Google's side (504)", async () => {
    const calls = fakeGemini([
      new ApiError({ message: "Deadline expired before operation could complete.", status: 504 }),
      jsonResponse({ isRecognizedDestination: true, ...MOCK }),
    ]);
    const result = await new GeminiRecommendationProvider().recommend("Kyoto");
    expect(calls.map((call) => call.model)).toEqual(["gemini-3.1-flash-lite", "gemini-3.6-flash"]);
    expect(result.model).toBe("gemini-3.6-flash");
  });

  it("falls back on a per-model rate limit and reports 429 when both models are exhausted", async () => {
    const calls = fakeGemini([
      new ApiError({ message: "Resource exhausted", status: 429 }),
      new ApiError({ message: "Resource exhausted", status: 429 }),
    ]);
    await expect(new GeminiRecommendationProvider().recommend("Kyoto")).rejects.toMatchObject({ kind: "rate_limit" });
    expect(calls.map((call) => call.model)).toEqual(["gemini-3.1-flash-lite", "gemini-3.6-flash"]);
  });

  it("does not try other models when the key is rejected", async () => {
    const calls = fakeGemini([new ApiError({ message: "API key not valid", status: 400 })]);
    await expect(new GeminiRecommendationProvider().recommend("Kyoto")).rejects.toMatchObject({ kind: "auth" });
    expect(calls).toHaveLength(1);
  });

  it.each([
    ["invalid JSON", { text: "not json", candidates: [{ finishReason: "STOP" }] }, "invalid_response"],
    ["schema mismatch", jsonResponse({ destination: "x" }), "invalid_response"],
    ["truncated output", jsonResponse({ isRecognizedDestination: true, ...MOCK }, "MAX_TOKENS"), "invalid_response"],
    ["blocked output", jsonResponse({}, "SAFETY"), "refused"],
    ["blocked prompt", { text: "", promptFeedback: { blockReason: "SAFETY" } }, "refused"],
  ])("rejects %s", async (_label, response, kind) => {
    fakeGemini([response as Partial<GenerateContentResponse>]);
    await expect(new GeminiRecommendationProvider().recommend("Kyoto")).rejects.toMatchObject({ kind });
  });
});

describe("mapGeminiError", () => {
  it("maps SDK, timeout and network errors to provider error kinds", () => {
    expect(mapGeminiError(new ApiError({ message: "quota", status: 429 })).kind).toBe("rate_limit");
    expect(mapGeminiError(new ApiError({ message: "denied", status: 403 })).kind).toBe("auth");
    expect(mapGeminiError(new ApiError({ message: "API key not valid", status: 400 })).kind).toBe("auth");
    expect(mapGeminiError(new ApiError({ message: "not found", status: 404 })).kind).toBe("model_unavailable");
    expect(mapGeminiError(new ApiError({ message: "overloaded", status: 503 })).kind).toBe("unavailable");
    expect(mapGeminiError(Object.assign(new Error("aborted"), { name: "AbortError" })).kind).toBe("unavailable");
    expect(mapGeminiError(new TypeError("fetch failed")).kind).toBe("unavailable");
    expect(mapGeminiError(new Error("weird")).kind).toBe("invalid_response");
  });

  it("never leaks the API key in error messages", () => {
    const error = mapGeminiError(new ApiError({ message: "API key not valid: AIzaSySECRET", status: 400 }));
    expect(error.message).not.toContain("AIza");
  });
});
