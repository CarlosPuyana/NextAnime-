import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { AdminAuth, hashPassword } from "../backend/src/admin.js";
import { createApp, type Services } from "../backend/src/app.js";
import { recommend } from "../backend/src/recommender.js";
import { profile, discoveries } from "./fixtures.js";
import { readGeminiConfig } from "../backend/src/gemini/config.js";
const password = "a-test-password-only-123";
const passwordHash = await hashPassword(password);
const config = {
  username: "owner",
  passwordHash,
  secret: "test-only-secret".repeat(4),
};
function setup() {
  let now = Date.now();
  const admin = new AdminAuth(config, () => now);
  const services: Services = {
    loadProfile: vi.fn(async () => profile),
    loadGenres: async () => [],
    loadDiscovery: async () => discoveries,
    loadDetails: async (a) => a,
  };
  const ranking = {
    status: () => ({
      available: false,
      reason: "disabled",
      message: "Desactivado",
      model: "test",
    }),
    rank: vi.fn(async (input: any) =>
      recommend(input.profile, input.candidates, input.preferences, input.seen),
    ),
  };
  const app = createApp(services, ranking, admin);
  const login = () =>
    request(app).post("/api/admin/login").send({ username: "owner", password });
  const body = (username = "SadPuyana") => ({
    username,
    preferences: { genres: [], source: "both", count: 5 },
    mode: "gemini",
    consent: { externalProcessing: true, adult: true, version: "2026-11-01" },
  });
  return {
    app,
    services,
    ranking,
    login,
    body,
    expire: () => {
      now += 4 * 60 * 60_000 + 1;
    },
  };
}
describe("private admin access", () => {
  it("hashes passwords with random salts and accepts the correct credentials", async () => {
    expect(passwordHash).not.toContain(password);
    expect(await hashPassword(password)).not.toBe(passwordHash);
    const { app, login } = setup();
    const result = await login();
    expect(result.status).toBe(200);
    expect(result.headers["set-cookie"]).toBeUndefined();
    expect(result.headers["cache-control"]).toBe("no-store");
    const session = await request(app)
      .get("/api/admin/session")
      .set("Authorization", `Bearer ${result.body.token}`);
    expect(session.body.authenticated).toBe(true);
    expect(JSON.stringify(result.body)).not.toContain(passwordHash);
  });
  it.each([
    { username: "wrong", password },
    { username: "owner", password: "wrong" },
  ])(
    "rejects incorrect credentials without revealing the field",
    async (input) => {
      const { app } = setup();
      const result = await request(app).post("/api/admin/login").send(input);
      expect(result.status).toBe(401);
      expect(result.body.error).toBe("Usuario o contraseña incorrectos.");
    },
  );
  it("expires sessions and rejects a tampered token", async () => {
    const { app, login, expire, body } = setup();
    const {
      body: { token },
    } = await login();
    expect(
      (
        await request(app)
          .post("/api/recommendations")
          .set("Authorization", `Bearer ${token}x`)
          .send(body())
      ).status,
    ).toBe(401);
    expire();
    expect(
      (
        await request(app)
          .get("/api/admin/session")
          .set("Authorization", `Bearer ${token}`)
      ).body.authenticated,
    ).toBe(false);
    expect(
      (
        await request(app)
          .post("/api/recommendations")
          .set("Authorization", `Bearer ${token}`)
          .send(body())
      ).status,
    ).toBe(401);
  });
  it("revokes logout tokens immediately, including copied tokens", async () => {
    const { app, login, body } = setup();
    const {
      body: { token },
    } = await login();
    expect(
      (
        await request(app)
          .post("/api/admin/logout")
          .set("Authorization", `Bearer ${token}`)
          .send({})
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post("/api/recommendations")
          .set("Authorization", `Bearer ${token}`)
          .send(body())
      ).status,
    ).toBe(401);
  });
  it("rejects a direct Gemini request before fetching MAL or invoking the ranker", async () => {
    const { app, body, services, ranking } = setup();
    expect(
      (await request(app).post("/api/recommendations").send(body())).status,
    ).toBe(401);
    expect(services.loadProfile).not.toHaveBeenCalled();
    expect(ranking.rank).not.toHaveBeenCalled();
    expect(
      (
        await request(app)
          .post("/api/recommendations")
          .send({ ...body(), mode: "classic" })
      ).status,
    ).toBe(200);
  });
  it.each(["SadPuyana", "Noraaa_12", "Antoniioman", "aniitabombii09"])(
    "permits the authenticated predefined profile %s and keeps classic fallback",
    async (username) => {
      const { app, login, body, ranking } = setup();
      const {
        body: { token },
      } = await login();
      const result = await request(app)
        .post("/api/recommendations")
        .set("Authorization", `Bearer ${token}`)
        .send(body(username));
      expect(result.status).toBe(200);
      expect(result.body.engine).toBe("classic");
      expect(ranking.rank).toHaveBeenCalledOnce();
    },
  );
  it("blocks another username even with a valid admin session", async () => {
    const { app, login, body, ranking } = setup();
    const {
      body: { token },
    } = await login();
    expect(
      (
        await request(app)
          .post("/api/recommendations")
          .set("Authorization", `Bearer ${token}`)
          .send(body("Guest_123"))
      ).status,
    ).toBe(403);
    expect(ranking.rank).not.toHaveBeenCalled();
  });
  it("blocks brute force after five attempts", async () => {
    const { app } = setup();
    for (let i = 0; i < 5; i++)
      expect(
        (
          await request(app)
            .post("/api/admin/login")
            .send({ username: "owner", password: "bad" })
        ).status,
      ).toBe(401);
    expect(
      (
        await request(app)
          .post("/api/admin/login")
          .send({ username: "owner", password })
      ).status,
    ).toBe(429);
  });
  it("fails closed when authentication is not configured and after a restart", async () => {
    const { login } = setup();
    const {
      body: { token },
    } = await login();
    const restarted = createApp(undefined, undefined, new AdminAuth(config));
    expect(
      (
        await request(restarted)
          .get("/api/admin/session")
          .set("Authorization", `Bearer ${token}`)
      ).body.authenticated,
    ).toBe(false);
    expect(
      (
        await request(
          createApp(
            undefined,
            undefined,
            new AdminAuth({ username: "", passwordHash: "", secret: "" }),
          ),
        )
          .post("/api/admin/login")
          .send({ username: "owner", password })
      ).status,
    ).toBe(503);
  });
  it("caps the existing quota to three daily requests and one concurrent", () => {
    const cfg = readGeminiConfig({
      GEMINI_DAILY_LIMIT: "100",
      GEMINI_MAX_CONCURRENT: "2",
    });
    expect(cfg.dailyLimit).toBe(3);
    expect(cfg.maxConcurrent).toBe(1);
  });
});
