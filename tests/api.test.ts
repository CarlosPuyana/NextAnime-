import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp, type Services } from "../backend/src/app.js";
import { profile, discoveries, action, romance } from "./fixtures.js";
import { ApiError } from "../backend/src/errors.js";
const services: Services = {
  loadProfile: vi.fn(async () => profile),
  loadGenres: async () => [action, romance],
  loadDiscovery: async () => discoveries,
  loadDetails: async (a) => a,
};
const app = createApp(services);
describe("API integration", () => {
  it("exposes safe availability and rejects Gemini without an admin session", async () => {
    const capabilities = await request(app).get("/api/capabilities");
    expect(capabilities.body.gemini.available).toBe(false);
    expect(JSON.stringify(capabilities.body)).not.toContain("apiKey");
    const r = await request(app)
      .post("/api/recommendations")
      .send({
        username: "SadPuyana",
        preferences: { genres: [], source: "both", count: 5 },
        mode: "gemini",
      });
    expect(r.status).toBe(401);
    const approved = await request(app)
      .post("/api/recommendations")
      .send({
        username: "SadPuyana",
        preferences: { genres: [], source: "both", count: 5 },
        mode: "gemini",
        consent: {
          externalProcessing: true,
          adult: true,
          version: "2026-11-01",
        },
      });
    expect(approved.status).toBe(401);
  });
  it("returns health without secrets", async () => {
    const r = await request(app).get("/api/health");
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("version", "3.2.0");
    expect(JSON.stringify(r.body)).not.toContain("CLIENT_ID");
  });
  it.each([
    "SadPuyana",
    "Noraaa_12",
    "Antoniioman",
    "aniitabombii09",
    "Custom_123",
  ])("retrieves profile %s with analysis", async (name) => {
    const r = await request(app).get(`/api/profiles/${name}`);
    expect(r.status).toBe(200);
    expect(r.body.analysis.rated).toBe(5);
  });
  it("rejects invalid names and request parameters", async () => {
    expect((await request(app).get("/api/profiles/bad%20name")).status).toBe(
      400,
    );
    expect(
      (
        await request(app)
          .post("/api/recommendations")
          .send({
            username: "SadPuyana",
            preferences: { genres: [], source: "invalid", count: 500 },
          })
      ).status,
    ).toBe(400);
  });
  it("rejects unexpected CORS origins", async () => {
    expect(
      (
        await request(app)
          .get("/api/genres")
          .set("Origin", "https://evil.example")
      ).status,
    ).toBe(403);
    const r = await request(app)
      .get("/api/genres")
      .set("Origin", "https://carlospuyana.github.io");
    expect(r.headers["access-control-allow-origin"]).toBe(
      "https://carlospuyana.github.io",
    );
  });
  it.each(["both", "pending", "discover"])(
    "returns verified real-id candidates for %s",
    async (source) => {
      const r = await request(app)
        .post("/api/recommendations")
        .send({
          username: "SadPuyana",
          preferences: { genres: [], source, count: 5 },
          seen: [],
        });
      expect(r.status).toBe(200);
      expect(r.body.items).toHaveLength(5);
      expect(r.body.items.every((i: any) => i.anime.id >= 100)).toBe(true);
      if (source !== "both")
        expect(r.body.items.every((i: any) => i.origin === source)).toBe(true);
    },
  );
  it("preserves source rules when discovery is unavailable", async () => {
    const broken = createApp({
      ...services,
      loadDiscovery: async () => {
        throw new ApiError(503, "API inaccesible");
      },
    });
    const r = await request(broken)
      .post("/api/recommendations")
      .send({
        username: "SadPuyana",
        preferences: { genres: [], source: "both", count: 5 },
      });
    expect(r.status).toBe(200);
    expect(r.body.warnings.join(" ")).toContain("solo tus pendientes");
    expect(r.body.items.every((i: any) => i.origin === "pending")).toBe(true);
  });
  it("returns fewer results rather than unverified candidates", async () => {
    const unavailable = createApp({
      ...services,
      loadDetails: async () => {
        throw new Error("offline");
      },
    });
    const r = await request(unavailable)
      .post("/api/recommendations")
      .send({
        username: "SadPuyana",
        preferences: { genres: [], source: "both", count: 5 },
      });
    expect(r.body.items).toHaveLength(0);
    expect(r.body.warnings.join(" ")).toContain("omitido");
  });
  it("returns missing user, private list, and source failures honestly", async () => {
    for (const status of [403, 404, 503]) {
      const failed = createApp({
        ...services,
        loadProfile: async () => {
          throw new ApiError(status, "Lista no disponible");
        },
      });
      expect((await request(failed).get("/api/profiles/Unknown")).status).toBe(
        status,
      );
    }
  });
  it("accepts empty lists and does not invent preferences", async () => {
    const empty = createApp({
      ...services,
      loadProfile: async () => ({ ...profile, anime: [] }),
    });
    const r = await request(empty).get("/api/profiles/EmptyList");
    expect(r.body.analysis.rated).toBe(0);
    expect(r.body.analysis.confidence).toBe("low");
  });
});
