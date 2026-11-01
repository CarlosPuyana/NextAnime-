import { describe, it, expect } from "vitest";
import { analyze, eligible, recommend } from "../backend/src/recommender.js";
import { anime, profile, action, romance, discoveries } from "./fixtures.js";
import type { Preferences } from "../shared/types.js";
const prefs: Preferences = { genres: [], source: "both", count: 5 };
describe("taste analysis", () => {
  it("uses only explicit completed ratings, independent of MAL means", () => {
    const result = analyze(profile);
    expect(result.rated).toBe(5);
    expect(result.favorites[0].genre.id).toBe(1);
    expect(
      result.favorites.find((t) => t.genre.id === 22)!.affinity,
    ).toBeLessThan(0);
  });
  it("does not treat zero or absent scores as negative preferences", () => {
    expect(
      analyze({
        ...profile,
        anime: [anime(1, { status: "completed", score: 0 })],
      }).rated,
    ).toBe(0);
  });
  it("reports uncertainty on sparse and empty lists", () => {
    expect(analyze({ ...profile, anime: [] }).confidence).toBe("low");
    expect(analyze({ ...profile, anime: [] }).favorites).toEqual([]);
  });
  it("shrinks small samples instead of ranking by volume alone", () => {
    const p = {
      ...profile,
      anime: [
        anime(1, { status: "completed", score: 10 }),
        ...Array.from({ length: 20 }, (_, i) =>
          anime(i + 10, { status: "completed", score: 2, genres: [romance] }),
        ),
      ],
    };
    expect(analyze(p).favorites[0].genre.id).toBe(action.id);
  });
});
describe("candidate rules", () => {
  const candidates = [...profile.anime, ...discoveries, discoveries[0]];
  it("empty selection includes all genres, with no duplicates", () => {
    const ids = eligible(profile, candidates, prefs).map((a) => a.id);
    expect(ids.length).toBe(65);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("multiple genres use OR, not AND", () => {
    expect(
      eligible(
        profile,
        [anime(500, { genres: [action] }), anime(501, { genres: [romance] })],
        { ...prefs, genres: [1, 22] },
      ),
    ).toHaveLength(2);
  });
  it("excludes completed, watching, paused and dropped", () => {
    expect(eligible(profile, candidates, prefs).some((a) => a.id < 100)).toBe(
      false,
    );
  });
  it("pending source includes only plan to watch", () => {
    expect(
      eligible(profile, candidates, { ...prefs, source: "pending" }).every(
        (a) => a.id >= 100 && a.id < 130,
      ),
    ).toBe(true);
  });
  it("external source excludes every title in every personal list", () => {
    expect(
      eligible(profile, candidates, { ...prefs, source: "discover" }),
    ).toHaveLength(35);
  });
  it("both includes pending and discoveries", () => {
    expect(eligible(profile, candidates, prefs)).toHaveLength(65);
  });
  it("rejects sequels with unmet prerequisites, including pending prequels", () => {
    expect(
      eligible(profile, [anime(500, { prequels: [100] })], prefs),
    ).toHaveLength(0);
    expect(
      eligible(profile, [anime(500, { prequels: [1] })], prefs),
    ).toHaveLength(1);
  });
  it("removes session history and never fills with invalid titles", () => {
    const first = recommend(profile, candidates, prefs);
    const second = recommend(
      profile,
      candidates,
      prefs,
      first.items.map((i) => i.anime.id),
    );
    expect(
      second.items.some((i) =>
        first.items.some((j) => j.anime.id === i.anime.id),
      ),
    ).toBe(false);
    expect(recommend(profile, [], prefs).warnings.length).toBeGreaterThan(0);
  });
  it.each([3, 5, 10, 20] as const)(
    "returns requested count %i when enough valid candidates exist",
    (count) => {
      expect(
        recommend(profile, candidates, { ...prefs, count }).items,
      ).toHaveLength(count);
    },
  );
  it("rewards positive affinities and penalizes low-rated genres", () => {
    const result = recommend(
      profile,
      [
        anime(500, { genres: [romance], mean: 8 }),
        anime(501, { genres: [action], mean: 8 }),
      ],
      prefs,
    );
    expect(result.items[0].anime.id).toBe(501);
    expect(result.items[0].explanation).toContain("tu media");
  });
  it("is deterministic and returns explanatory ranking scores, not probabilities", () => {
    expect(recommend(profile, candidates, prefs)).toEqual(
      recommend(profile, candidates, prefs),
    );
    expect(recommend(profile, candidates, prefs).explanationMode).toBe(
      "deterministic",
    );
  });
});
