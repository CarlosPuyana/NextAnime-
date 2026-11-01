import { createHash } from "node:crypto";
import { Cache } from "../cache.js";
import { analyze, ALGORITHM_VERSION } from "../recommender.js";
import type {
  Anime,
  Preferences,
  Profile,
  Recommendation,
} from "../../../shared/types.js";
export const PROMPT_VERSION = "narrative-evidence-1";
export const clip = (s: string | null | undefined, max: number) =>
  s?.replace(/\s+/g, " ").trim().slice(0, max) ?? "";
export function dataVersion(profile: Profile): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        profile.anime.map((a) => [
          a.id,
          a.status,
          a.score,
          a.genres,
          a.synopsis,
          a.mean,
          a.format,
          a.prequels,
        ]),
      ),
    )
    .digest("hex");
}
export function franchiseKey(a: Anime): string {
  return a.title
    .toLowerCase()
    .split(":")[0]
    .replace(
      /\b(?:\d+(?:st|nd|rd|th)?\s*season|season\s*\d+|part\s*\d+|ii+|iv|v)\b/g,
      "",
    )
    .replace(/[^\p{L}]+/gu, " ")
    .trim();
}
export function representativeExamples(anime: Anime[], limit: number): Anime[] {
  const families = new Set<string>();
  const selected: Anime[] = [];
  for (const a of anime) {
    const key = franchiseKey(a);
    if (families.has(key)) continue;
    families.add(key);
    selected.push(a);
    if (selected.length >= limit) break;
  }
  return selected;
}
const compact = (a: Anime) => ({
  animeId: a.id,
  title: clip(a.title, 100),
  personalScore: a.score,
  synopsis: clip(a.synopsis, 300),
  genres: a.genres.slice(0, 6).map((g) => clip(g.name, 35)),
  format: a.format,
  year: a.year,
});
const tasteCache = new Cache<ReturnType<typeof buildTaste>>(5 * 60000, 50);
function buildTaste(profile: Profile) {
  const analysis = analyze(profile);
  const rated = profile.anime.filter(
    (a) =>
      a.status === "completed" &&
      a.score !== null &&
      a.score >= 1 &&
      a.score <= 10,
  );
  return {
    statistics: {
      rated: analysis.rated,
      confidence: analysis.confidence,
      mean: rated.reduce((s, a) => s + a.score!, 0) / (rated.length || 1),
    },
    positive: representativeExamples(
      rated
        .filter((a) => a.score! >= 8)
        .sort((a, b) => b.score! - a.score! || a.id - b.id),
      8,
    ).map(compact),
    negative: representativeExamples(
      rated
        .filter((a) => a.score! <= 5)
        .sort((a, b) => a.score! - b.score! || a.id - b.id),
      3,
    ).map(compact),
    affinities: [
      ...analysis.favorites.filter((t) => t.affinity > 0).slice(0, 6),
      ...analysis.favorites.filter((t) => t.affinity < 0).slice(-4),
    ].map((t) => ({
      genre: t.genre.name,
      mean: t.mean,
      samples: t.samples,
      affinity: t.affinity,
    })),
  };
}
export function buildContext(
  profile: Profile,
  candidates: Recommendation[],
  preferences: Preferences,
) {
  const version = dataVersion(profile);
  let taste = tasteCache.get(version);
  if (!taste) taste = tasteCache.set(version, buildTaste(profile));
  return {
    algorithm: ALGORITHM_VERSION,
    promptVersion: PROMPT_VERSION,
    taste,
    preferences: {
      ...preferences,
      genres: [...preferences.genres].sort((a, b) => a - b),
    },
    candidates: candidates.map((i) => ({
      ...compact(i.anime),
      personalScore: undefined,
      publicMean: i.anime.mean,
      episodes: i.anime.episodes,
      algorithmScore: i.rankingScore,
      origin: i.origin,
    })),
  };
}
export type GeminiContext = ReturnType<typeof buildContext>;
