import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { AnimeRatingsService } from "../backend/src/anime-ratings.js";
import { createApp } from "../backend/src/app.js";
import { ApiError } from "../backend/src/errors.js";

describe("anime ratings by name", () => {
  it("returns the official ID, canonical title and public mean rather than a personal score", async () => {
    const source = vi.fn(async () => ({
      data: [
        { node: { id: 1735, title: "Naruto: Shippuuden", mean: 8.29 } },
        { node: { id: 20, title: "Naruto", mean: 8.03, score: 10 } },
      ],
    }));
    expect(await new AnimeRatingsService(source).lookup(["Naruto"])).toEqual([
      { id: 20, name: "Naruto", score: 8.03 },
    ]);
    const url = new URL(source.mock.calls[0][0]);
    expect(url.origin).toBe("https://api.myanimelist.net");
    expect(url.searchParams.get("q")).toBe("Naruto");
    expect(url.searchParams.get("fields")).toBe("mean,alternative_titles");
  });
  it("matches English and alternative titles without guessing the first season returned", async () => {
    const source = vi.fn(async () => ({
      data: [
        {
          node: {
            id: 48583,
            title: "Shingeki no Kyojin: The Final Season Part 2",
            mean: 8.7,
            alternative_titles: { en: "Attack on Titan: Final Season Part 2" },
          },
        },
        {
          node: {
            id: 16498,
            title: "Shingeki no Kyojin",
            mean: 8.6,
            alternative_titles: { en: "Attack on Titan" },
          },
        },
      ],
    }));
    expect(
      await new AnimeRatingsService(source).lookup(["Attack on Titan"]),
    ).toEqual([{ id: 16498, name: "Shingeki no Kyojin", score: 8.6 }]);
  });
  it("preserves order and duplicates while caching equivalent names", async () => {
    const source = vi.fn(async (url: string) => ({
      data: [
        {
          node:
            new URL(url).searchParams.get("q") === "Naruto"
              ? { id: 20, title: "Naruto", mean: 8 }
              : { id: 9253, title: "Steins;Gate", mean: 9 },
        },
      ],
    }));
    const service = new AnimeRatingsService(source);
    const result = await service.lookup(["Naruto", "SteinsGate", "NARUTO"]);
    expect(result.map((a) => a.id)).toEqual([20, 9253, 20]);
    expect(source).toHaveBeenCalledTimes(2);
    await service.lookup(["naruto"]);
    expect(source).toHaveBeenCalledTimes(2);
  });
  it("coalesces concurrent identical searches", async () => {
    let finish!: (value: unknown) => void;
    const source = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const service = new AnimeRatingsService(source);
    const first = service.lookup(["Naruto"]),
      second = service.lookup(["NARUTO"]);
    finish({ data: [{ node: { id: 20, title: "Naruto", mean: 8 } }] });
    expect(await first).toEqual(await second);
    expect(source).toHaveBeenCalledOnce();
  });
  it("reports missing names, ambiguous names and unrated titles without fabricated ratings", async () => {
    const source = vi
      .fn()
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          { node: { id: 1, title: "Example Season One", mean: 8 } },
          { node: { id: 2, title: "Example Season Two", mean: 7 } },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { node: { id: 3, title: "Future Title", alternative_titles: null } },
        ],
      });
    expect(
      await new AnimeRatingsService(source).lookup([
        "Missing Title",
        "Example",
        "Future Title",
      ]),
    ).toEqual([
      { id: null, name: "Missing Title", score: null, error: "not_found" },
      {
        id: null,
        name: "Example",
        score: null,
        error: "ambiguous",
        candidates: [
          { id: 1, name: "Example Season One", score: 8 },
          { id: 2, name: "Example Season Two", score: 7 },
        ],
      },
      { id: 3, name: "Future Title", score: null },
    ]);
  });
  it("rejects malformed upstream data and does not cache source failures", async () => {
    const source = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ node: { id: 20, title: "Naruto", mean: "wrong" } }],
      })
      .mockResolvedValueOnce({
        data: [{ node: { id: 20, title: "Naruto", mean: 8 } }],
      });
    const service = new AnimeRatingsService(source);
    await expect(service.lookup(["Naruto"])).rejects.toMatchObject({
      status: 502,
    });
    expect((await service.lookup(["Naruto"]))[0].score).toBe(8);
  });
});

describe("POST /api/anime/ratings", () => {
  it("works publicly and returns only the three requested fields for resolved names", async () => {
    const lookup = vi.fn(async () => [{ id: 20, name: "Naruto", score: 8.03 }]);
    const response = await request(
      createApp(undefined, undefined, undefined, { lookup }),
    )
      .post("/api/anime/ratings")
      .send({ names: ["  Naruto  "] });
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual([{ id: 20, name: "Naruto", score: 8.03 }]);
    expect(lookup).toHaveBeenCalledWith(["Naruto"]);
  });
  it.each([
    {},
    { names: "Naruto" },
    { names: [20] },
    { names: [""] },
    { names: ["86"] },
    { names: ["!!!"] },
    { names: ["Naru\nto"] },
    { names: Array(21).fill("Naruto") },
  ])("rejects invalid input %j before any source calls", async (input) => {
    const lookup = vi.fn(async () => []);
    const response = await request(
      createApp(undefined, undefined, undefined, { lookup }),
    )
      .post("/api/anime/ratings")
      .send(input);
    expect(response.status).toBe(400);
    expect(lookup).not.toHaveBeenCalled();
  });
  it("accepts an empty list and propagates upstream failure as a clear HTTP error", async () => {
    const service = new AnimeRatingsService(vi.fn());
    expect(
      (
        await request(createApp(undefined, undefined, undefined, service))
          .post("/api/anime/ratings")
          .send({ names: [] })
      ).body,
    ).toEqual([]);
    const lookup = vi.fn(async () => {
      throw new ApiError(503, "MyAnimeList no está disponible.");
    });
    const response = await request(
      createApp(undefined, undefined, undefined, { lookup }),
    )
      .post("/api/anime/ratings")
      .send({ names: ["Naruto"] });
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: "MyAnimeList no está disponible." });
  });
});
