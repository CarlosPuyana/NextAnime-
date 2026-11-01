import { it, expect, vi } from "vitest";
import {
  loadProfile,
  normalizeMAL,
  upstream,
  validUsername,
} from "../backend/src/providers.js";
it("loads every page, rebuilds offsets, and deduplicates MAL ids", async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({
      data: Array.from({ length: 1000 }, (_, i) => ({
        node: { id: i + 1, title: `A ${i}` },
        list_status: { status: "completed", score: 9 },
      })),
      paging: { next: "https://evil.example/steal" },
    })
    .mockResolvedValueOnce({
      data: [
        {
          node: { id: 1000, title: "duplicate" },
          list_status: { status: "plan_to_watch", score: 0 },
        },
        {
          node: { id: 1001, title: "Last" },
          list_status: { status: "watching", score: 0 },
        },
      ],
      paging: {},
    });
  const p = await loadProfile("PageTest", request);
  expect(p.anime).toHaveLength(1001);
  expect(request.mock.calls[1][0]).toContain("offset=1000");
  expect(request.mock.calls[1][0]).toContain("api.myanimelist.net");
  expect(p.anime.find((a) => a.id === 1000)?.score).toBe(null);
});
it("separates personal rating from public mean and preserves missing metadata", () => {
  const a = normalizeMAL(
    { id: 1, title: "Test", mean: 9.5 },
    { status: "completed", score: 0 },
  );
  expect(a.score).toBe(null);
  expect(a.mean).toBe(9.5);
  expect(a.episodes).toBe(null);
});
it("does not silently accept malformed list data or broken pagination", async () => {
  await expect(
    loadProfile(
      "Broken",
      vi.fn().mockResolvedValue({ data: [], paging: { next: "x" } }),
    ),
  ).rejects.toThrow("paginación");
  await expect(
    loadProfile(
      "Malformed",
      vi.fn().mockResolvedValue({ data: [{ node: { id: 1, title: "x" } }] }),
    ),
  ).rejects.toThrow("estados");
});
it("validates usernames and prevents arbitrary upstream URLs", async () => {
  expect(validUsername("Noraaa_12")).toBe(true);
  expect(validUsername("../secret")).toBe(false);
  await expect(upstream("https://example.com/")).rejects.toThrow("permitida");
});
it("maps upstream inaccessible and missing lists to clear errors", async () => {
  await expect(
    upstream(
      "https://api.myanimelist.net/v2/users/Private/animelist",
      vi.fn().mockResolvedValue(new Response("{}", { status: 403 })),
    ),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    upstream(
      "https://api.myanimelist.net/v2/users/Missing/animelist",
      vi.fn().mockResolvedValue(new Response("{}", { status: 404 })),
    ),
  ).rejects.toMatchObject({ status: 404 });
});
