import { expect, it, vi } from "vitest";
import request from "supertest";
import { loadPlanToWatch } from "../backend/src/providers.js";
import { createApp } from "../backend/src/app.js";
import { ApiError } from "../backend/src/errors.js";

const item = (id: number) => ({
  node: { id, title: `Anime ${id}` },
  list_status: { status: "plan_to_watch", score: 0 },
});
it("loads all pending pages, deduplicates IDs, and never follows arbitrary next URLs", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      data: Array.from({ length: 1000 }, (_, i) => item(i + 1)),
      paging: { next: "https://evil.example/" },
    })
    .mockResolvedValueOnce({ data: [item(1000), item(1001)], paging: {} });
  const result = await loadPlanToWatch("SadPuyana", fetcher);
  expect(result.data).toHaveLength(1001);
  expect(result.paging).toEqual({});
  for (const [url] of fetcher.mock.calls) {
    expect(new URL(url).host).toBe("api.myanimelist.net");
    expect(new URL(url).searchParams.get("status")).toBe("plan_to_watch");
  }
  expect(fetcher.mock.calls[1][0]).toContain("offset=1000");
});
it("handles empty lists and rejects invalid usernames before fetching", async () => {
  const fetcher = vi.fn().mockResolvedValue({ data: [], paging: {} });
  expect(await loadPlanToWatch("Empty", fetcher)).toEqual({
    data: [],
    paging: {},
  });
  await expect(loadPlanToWatch("bad name", fetcher)).rejects.toMatchObject({
    status: 400,
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("fails instead of returning partial, malformed, or endlessly repeated pages", async () => {
  for (const page of [
    null,
    {},
    { data: [{ node: { id: 1, title: "x" } }] },
    { data: [{ ...item(1), list_status: { status: "completed" } }] },
    { data: [], paging: { next: "x" } },
  ]) {
    await expect(
      loadPlanToWatch("Broken", vi.fn().mockResolvedValue(page)),
    ).rejects.toMatchObject({ status: 502 });
  }
  await expect(
    loadPlanToWatch(
      "Repeated",
      vi.fn().mockResolvedValue({ data: [item(1)], paging: { next: "x" } }),
    ),
  ).rejects.toMatchObject({ status: 502 });
});
it.each(["/getPlanToWatch/SadPuyana", "/api/getPlanToWatch/SadPuyana"])(
  "preserves the external client's contract at %s",
  async (path) => {
    const loader = vi.fn(async () => ({
      data: [item(1), item(2)],
      paging: {},
    }));
    const app = createApp({
      loadPlanToWatch: loader,
      loadProfile: vi.fn(),
      loadGenres: vi.fn(),
      loadDiscovery: vi.fn(),
      loadDetails: vi.fn(),
    });
    const response = await request(app)
      .get(path)
      .set("Origin", "http://localhost:3000");
    expect(response.status).toBe(200);
    expect(
      response.body.data.map(
        (entry: { node: { title: string } }) => entry.node.title,
      ),
    ).toEqual(["Anime 1", "Anime 2"]);
    expect(loader).toHaveBeenCalledWith("SadPuyana");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
  },
);
it("limits localhost CORS access to the public pending route", async () => {
  const app = createApp();
  expect(
    (
      await request(app)
        .get("/api/capabilities")
        .set("Origin", "http://localhost:3000")
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .get("/getPlanToWatch/Test")
        .set("Origin", "http://localhost.evil.example:3000")
    ).status,
  ).toBe(403);
  expect((await request(app).get("/getPlanToWatch/bad%20name")).status).toBe(
    400,
  );
  expect(
    (await request(app).get("/api/capabilities").set("Origin", "null")).status,
  ).toBe(403);
});
it("supports the original client from a directly opened index.html", async () => {
  const app = createApp({
    loadPlanToWatch: async () => ({ data: [item(1)], paging: {} }),
    loadProfile: vi.fn(),
    loadGenres: vi.fn(),
    loadDiscovery: vi.fn(),
    loadDetails: vi.fn(),
  });
  const response = await request(app)
    .get("/getPlanToWatch/SadPuyana")
    .set("Origin", "null");
  expect(response.status).toBe(200);
  expect(response.headers["access-control-allow-origin"]).toBe("null");
  expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
});
it.each([403, 404, 503])("preserves source error %i", async (status) => {
  const app = createApp({
    loadPlanToWatch: async () => {
      throw new ApiError(status, "Lista no disponible");
    },
    loadProfile: vi.fn(),
    loadGenres: vi.fn(),
    loadDiscovery: vi.fn(),
    loadDetails: vi.fn(),
  });
  const response = await request(app).get("/getPlanToWatch/Unknown");
  expect(response.status).toBe(status);
  expect(response.body).toEqual({ error: "Lista no disponible" });
});
