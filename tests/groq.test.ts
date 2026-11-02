import { describe, expect, it, vi } from "vitest";
import {
  GroqRankingService,
  readGroqConfig,
  buildGroqContext,
  validateGroqRanking,
  estimateGroqTokens,
} from "../backend/src/groq/ranking.js";
import { GroqHTTPError, groqRequest } from "../backend/src/groq/client.js";
import {
  MemoryQuotaStore,
  type QuotaStore,
} from "../backend/src/gemini/quota.js";
import { rankCandidates, recommend } from "../backend/src/recommender.js";
import { createApp, type Services } from "../backend/src/app.js";
import { AdminAuth, hashPassword } from "../backend/src/admin.js";
import type { GeminiTransport, HybridInput } from "../backend/src/ai.js";
import { profile, discoveries } from "./fixtures.js";
import request from "supertest";
const config = () =>
  readGroqConfig({
    GROQ_ENABLED: "true",
    GROQ_API_KEY: "test-only-not-a-real-key",
    GROQ_TPM_LIMIT: "8000",
  });
const input = (): HybridInput => ({
  profile,
  candidates: [...profile.anime, ...discoveries],
  preferences: { genres: [], source: "both", count: 3 },
  seen: [],
  mode: "groq",
  consent: { externalProcessing: true, adult: true, version: "2026-11-01" },
  client: "test",
});
const quota = (): QuotaStore => ({
  reserve: vi.fn(() => true),
  circuit: () => false,
  failure: vi.fn(),
  success: vi.fn(),
});
const references = (
  candidate: Parameters<GeminiTransport>[0]["candidates"][number],
) =>
  (
    candidate as typeof candidate & { comparableFavoriteIds: number[] }
  ).comparableFavoriteIds.slice(0, 2);
const output = (context: Parameters<GeminiTransport>[0]) => ({
  recommendations: context.candidates
    .slice(-Math.min(3, context.candidates.length))
    .reverse()
    .map((a, i) => ({
      animeId: a.animeId,
      rank: i + 1,
      reason: [
        "Puede encajarte por la aventura de su protagonista y los vínculos con sus compañeros. Es una propuesta exploratoria basada en las sinopsis de tu lista.",
        "Podría interesarte el contraste entre las metas del protagonista y las dificultades del camino. Su premisa permite explorar el coste personal de seguir adelante.",
        "La atmósfera de misterio puede encajar con tu interés por descubrir mundos junto a sus personajes. Es una conexión tentativa basada en las sinopsis disponibles.",
      ][i],
      favoriteAnimeIds: references(a),
      connection: references(a).length
        ? [
            "la aventura y el papel de los vínculos entre sus protagonistas",
            "el coste personal de perseguir objetivos en un mundo hostil",
            "la atmósfera de descubrimiento y los conflictos de sus personajes",
          ][i]
        : null,
    })),
});
const good: GeminiTransport = async (context) => ({
  text: JSON.stringify(output(context)),
  inputTokens: 2200,
  outputTokens: 180,
});
describe("Groq integration", () => {
  it("preserves provider HTTP 504 even when a gateway returns HTML instead of JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Gateway timeout", { status: 504 })),
    );
    try {
      await expect(
        groqRequest(config(), { messages: [] }),
      ).rejects.toMatchObject({ status: 504 });
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("has an independent 45-second configuration, six requests and no dependency on Gemini flags", () => {
    const c = readGroqConfig({
      GEMINI_ENABLED: "false",
      GEMINI_DEPLOYMENT_REGION: "EEA",
      GEMINI_FREE_TIER_VERIFIED: "false",
      GROQ_ENABLED: "true",
      GROQ_API_KEY: "test-only",
    });
    expect(c.timeoutMs).toBe(45000);
    expect(c.dailyLimit).toBe(6);
    expect(c.maxConcurrent).toBe(1);
    expect(new GroqRankingService(c).status()).toMatchObject({
      available: true,
      provider: "groq",
      model: "openai/gpt-oss-20b",
    });
    expect(new GroqRankingService(readGroqConfig({})).status().available).toBe(
      false,
    );
  });
  it("compacts context, adapts to a lower token budget, and never sends identities or full histories", () => {
    const i = input(),
      candidates = rankCandidates(
        i.profile,
        i.candidates,
        i.preferences,
        [],
        12,
      );
    const context = buildGroqContext(i.profile, candidates, i.preferences);
    expect(context.candidates.length).toBeLessThanOrEqual(12);
    expect(context.taste.positive.length).toBeLessThanOrEqual(5);
    expect(context.taste.negative.length).toBeLessThanOrEqual(2);
    expect(estimateGroqTokens(context)).toBeLessThan(4000);
    expect(JSON.stringify(context)).not.toContain("SadPuyana");
    expect(JSON.stringify(context)).not.toContain("test-only");
    expect(
      estimateGroqTokens(
        buildGroqContext(i.profile, candidates, i.preferences, 1000),
      ),
    ).toBeLessThanOrEqual(estimateGroqTokens(context));
  });
  it("changes real selection/order rather than just explanations and caches the validated result", async () => {
    const call = vi.fn(good),
      service = new GroqRankingService(config(), call, quota()),
      i = input();
    const result = await service.rank(i);
    expect(result.engine).toBe("groq");
    expect(result.items).toHaveLength(3);
    expect(result.items.map((a) => a.anime.id)).not.toEqual(
      recommend(i.profile, i.candidates, i.preferences).items.map(
        (a) => a.anime.id,
      ),
    );
    expect(result.engineInfo).toMatchObject({
      used: "groq",
      inputTokens: 2200,
      outputTokens: 180,
    });
    expect((await service.rank(i)).engineInfo?.cacheHit).toBe(true);
    expect(call).toHaveBeenCalledOnce();
  });
  it.each([
    "foreign",
    "duplicate",
    "rank",
    "partial",
    "invented",
    "spoiler",
    "repeated_reason",
  ])("rejects %s output with classic fallback", async (kind) => {
    const call: GeminiTransport = async (context) => {
      const data = output(context);
      if (kind === "foreign") data.recommendations[0].animeId = 999999;
      if (kind === "duplicate")
        data.recommendations[0].animeId = data.recommendations[1].animeId;
      if (kind === "rank") data.recommendations[0].rank = 3;
      if (kind === "partial") data.recommendations.pop();
      if (kind === "invented")
        data.recommendations[0].favoriteAnimeIds = [999999];
      if (kind === "spoiler")
        data.recommendations[0].reason =
          "Puede interesarte porque el protagonista muere al final y esto cambia por completo el desenlace de la historia.";
      if (kind === "repeated_reason")
        data.recommendations[1].reason = data.recommendations[0].reason;
      return { text: JSON.stringify(data) };
    };
    const result = await new GroqRankingService(config(), call, quota()).rank(
      input(),
    );
    expect(result.engine).toBe("classic");
    expect(result.engineInfo?.fallbackReason).toBe("invalid_response");
  });
  it("rejects invented favorites and renders real favorite titles and personal scores", () => {
    const i = input(),
      context = buildGroqContext(
        i.profile,
        rankCandidates(i.profile, i.candidates, i.preferences),
        i.preferences,
      );
    const data = output(context);
    const valid = validateGroqRanking(JSON.stringify(data), context);
    expect(valid[0].explanation).toContain(context.taste.positive[0].title);
    expect(valid[0].explanation).toContain(
      `${context.taste.positive[0].personalScore}/10`,
    );
    data.recommendations[0].favoriteAnimeIds = [999999];
    expect(() => validateGroqRanking(JSON.stringify(data), context)).toThrow();
  });
  it("requires personal references when comparable favorites exist and rejects duplicate references", () => {
    const i = input(),
      context = buildGroqContext(
        i.profile,
        rankCandidates(i.profile, i.candidates, i.preferences),
        i.preferences,
      );
    const data = output(context);
    const item = data.recommendations.find(
      (a) => a.favoriteAnimeIds.length > 0,
    )!;
    const realId = item.favoriteAnimeIds[0];
    item.favoriteAnimeIds = [];
    item.connection = null;
    expect(() => validateGroqRanking(JSON.stringify(data), context)).toThrow();
    item.favoriteAnimeIds = [realId, realId];
    item.connection = "los conflictos de sus protagonistas y sus vínculos";
    expect(() => validateGroqRanking(JSON.stringify(data), context)).toThrow();
  });
  it("does not invent comparisons for a profile without rated favorites", async () => {
    const i = input();
    i.profile = { ...i.profile, anime: [] };
    const result = await new GroqRankingService(config(), good, quota()).rank(
      i,
    );
    expect(result.engine).toBe("groq");
    expect(
      result.items.every((a) => !a.explanation.includes("Como te gust")),
    ).toBe(true);
  });
  it("cleans a redundant model prefix in the real received connection format", () => {
    const i = input(),
      context = buildGroqContext(
        i.profile,
        rankCandidates(i.profile, i.candidates, i.preferences),
        i.preferences,
      );
    const data = output(context);
    const item = data.recommendations.find(
      (a) => a.favoriteAnimeIds.length > 0,
    )!;
    item.connection =
      "podría gustarte también por su mezcla de aventura épica y desarrollo de personajes profundos";
    const result = validateGroqRanking(JSON.stringify(data), context);
    const explanation = result.find(
      (a) => a.animeId === item.animeId,
    )!.explanation;
    expect(explanation).toContain(
      "podría gustarte también por su mezcla de aventura épica",
    );
    expect(explanation).not.toContain("por podría gustarte");
  });
  it("does not call the provider without consent, key, or the initial count of three", async () => {
    const call = vi.fn(good);
    for (const i of [
      { ...input(), consent: undefined },
      {
        ...input(),
        preferences: { ...input().preferences, count: 5 as const },
      },
    ])
      expect(
        (await new GroqRankingService(config(), call, quota()).rank(i)).engine,
      ).toBe("classic");
    expect(
      (
        await new GroqRankingService(
          { ...config(), apiKey: "" },
          call,
          quota(),
        ).rank(input())
      ).engine,
    ).toBe("classic");
    expect(call).not.toHaveBeenCalled();
  });
  it("keeps requests alive past the old 12/20-second limits and aborts at 45 seconds", async () => {
    vi.useFakeTimers();
    try {
      let completed = false;
      const service = new GroqRankingService(
        config(),
        () => new Promise(() => {}),
        quota(),
      );
      const pending = service.rank(input()).then((r) => {
        completed = true;
        return r;
      });
      await vi.advanceTimersByTimeAsync(20000);
      expect(completed).toBe(false);
      await vi.advanceTimersByTimeAsync(25001);
      expect((await pending).engineInfo?.fallbackReason).toBe("timeout");
    } finally {
      vi.useRealTimers();
    }
  });
  it.each([
    [504, "provider_timeout"],
    [429, "quota"],
    [401, "credential"],
    [404, "model"],
  ])("distinguishes HTTP %s and never retries", async (status, reason) => {
    const call = vi.fn(async () => {
      throw new GroqHTTPError(Number(status), "test_error", 3000);
    });
    const result = await new GroqRankingService(config(), call, quota()).rank(
      input(),
    );
    expect(result.engineInfo?.fallbackReason).toBe(reason);
    expect(result.engineInfo?.providerStatus).toBe(status);
    expect(call).toHaveBeenCalledOnce();
    expect(result.warnings.join()).toContain("Groq");
    expect(result.warnings.join()).not.toContain("Google");
  });
  it("uses atomic rolling TPM limits even across a calendar-minute boundary", () => {
    const q = new MemoryQuotaStore(),
      c = { ...config(), minuteLimit: 10, minuteTokens: 8000 },
      start = 1700000039000;
    expect(q.reserve(start, "p", "c", 5000, c)).toBe(true);
    expect(q.reserve(start + 22000, "p", "c", 5000, c)).toBe(false);
    expect(q.reserve(start + 61000, "p", "c", 5000, c)).toBe(true);
    q.close();
  });
  it("sends official strict JSON requests with a real 45s timeout and low reasoning", async () => {
    const fake = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      expect(body.model).toBe("openai/gpt-oss-20b");
      expect(body.reasoning_effort).toBe("low");
      expect(body.response_format.json_schema.strict).toBe(true);
      return new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify(
                  output(JSON.parse(body.messages[1].content)),
                ),
              },
            },
          ],
          usage: { prompt_tokens: 1000, completion_tokens: 100 },
        }),
        { status: 200, headers: { "x-ratelimit-limit-tokens": "8000" } },
      );
    });
    vi.stubGlobal("fetch", fake);
    try {
      expect(
        (
          await new GroqRankingService(config(), undefined, quota()).rank(
            input(),
          )
        ).engine,
      ).toBe("groq");
      expect(fake).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("protects Groq at the HTTP boundary for visitors, other profiles and valid admins", async () => {
    const password = "a-test-only-password",
      auth = new AdminAuth({
        username: "owner",
        passwordHash: await hashPassword(password),
        secret: "x".repeat(40),
      });
    const services: Services = {
      loadProfile: vi.fn(async () => profile),
      loadGenres: async () => [],
      loadDiscovery: async () => discoveries,
      loadDetails: async (a) => a,
    };
    const call = vi.fn(good),
      app = createApp(
        services,
        new GroqRankingService(config(), call, quota()),
        auth,
      );
    const body = { ...input(), username: "SadPuyana" };
    expect(
      (await request(app).post("/api/recommendations").send(body)).status,
    ).toBe(401);
    const login = await request(app)
      .post("/api/admin/login")
      .send({ username: "owner", password });
    expect(
      (
        await request(app)
          .post("/api/recommendations")
          .set("Authorization", `Bearer ${login.body.token}`)
          .send({ ...body, username: "Guest_123" })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/recommendations")
          .set("Authorization", `Bearer ${login.body.token}`)
          .send(body)
      ).body.engine,
    ).toBe("groq");
    expect(call).toHaveBeenCalledOnce();
  });
});
