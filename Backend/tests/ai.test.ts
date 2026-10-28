import Anthropic from "@anthropic-ai/sdk";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { mapAnthropicError } from "../src/services/ai/anthropicProvider";
import { setRecommendationProvider } from "../src/services/ai/recommendationService";
import { AiProviderError, type Recommendation, type RecommendationProvider } from "../src/services/ai/types";
import { api, createUser, startDatabase, stopDatabase } from "./helpers";

beforeAll(startDatabase);
afterAll(stopDatabase);
afterEach(() => setRecommendationProvider(undefined));

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

const provider = (impl: RecommendationProvider["recommend"]): RecommendationProvider => ({
  name: "mock",
  model: "mock-model",
  recommend: impl,
});

async function ask(destination = "Kyoto") {
  const { token } = await createUser("USER");
  return api().post("/api/ai/recommendations").set("Authorization", `Bearer ${token}`).send({ destination });
}

describe("POST /api/ai/recommendations (mocked provider)", () => {
  it("returns the structured recommendation from the provider", async () => {
    let received = "";
    setRecommendationProvider(provider(async (destination) => ((received = destination), MOCK)));
    const res = await ask("  Kyoto  ");
    expect(res.status).toBe(200);
    expect(received).toBe("Kyoto");
    expect(res.body.data).toMatchObject({ recommendation: MOCK, provider: "mock", model: "mock-model" });
  });

  it("reports a missing API key as 503 instead of faking an answer", async () => {
    setRecommendationProvider(null);
    const res = await ask();
    expect(res.status).toBe(503);
    expect(res.body.error.message).toMatch(/not configured/i);
  });

  it("returns 422 when the provider does not recognise the destination", async () => {
    setRecommendationProvider(provider(async () => null));
    expect((await ask("asdfgh")).status).toBe(422);
  });

  it.each([
    ["rate_limit", 429],
    ["unavailable", 503],
    ["invalid_response", 502],
    ["auth", 502],
  ] as const)("maps provider error %s to HTTP %i", async (kind, status) => {
    setRecommendationProvider(
      provider(async () => {
        throw new AiProviderError(kind, "boom");
      }),
    );
    expect((await ask()).status).toBe(status);
  });

  it("validates input and enforces the USER role", async () => {
    setRecommendationProvider(provider(async () => MOCK));
    expect((await ask("")).status).toBe(400);
    const admin = await createUser("ADMIN");
    const res = await api().post("/api/ai/recommendations").set("Authorization", `Bearer ${admin.token}`).send({ destination: "Rome" });
    expect(res.status).toBe(403);
    expect((await api().post("/api/ai/recommendations").send({ destination: "Rome" })).status).toBe(401);
  });
});

describe("mapAnthropicError", () => {
  it("maps SDK error classes to provider error kinds", () => {
    const headers = new Headers();
    expect(mapAnthropicError(new Anthropic.RateLimitError(429, {}, "rate", headers)).kind).toBe("rate_limit");
    expect(mapAnthropicError(new Anthropic.AuthenticationError(401, {}, "auth", headers)).kind).toBe("auth");
    expect(mapAnthropicError(new Anthropic.APIConnectionError({ message: "down" })).kind).toBe("unavailable");
    expect(mapAnthropicError(new Error("weird")).kind).toBe("invalid_response");
  });
});
