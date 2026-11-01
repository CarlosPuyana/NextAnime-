import type {
  Anime,
  Analysis,
  Preferences,
  Profile,
  Recommendation,
  Results,
  Taste,
} from "../../shared/types.js";
import { genreName } from "../../shared/genre-labels.js";
export const DEFAULT_WEIGHTS = {
  affinity: 2.8,
  semantic: 1.5,
  quality: 0.45,
  filter: 0.7,
  diversity: 0.65,
  format: 0.25,
};
export const ALGORITHM_VERSION = "3.0-content-mmr-1";
export function analyze(profile: Profile): Analysis {
  const rated = profile.anime.filter(
    (a) =>
      a.status === "completed" &&
      a.score !== null &&
      a.score >= 1 &&
      a.score <= 10,
  );
  const baseline =
    rated.reduce((sum, a) => sum + a.score!, 0) / (rated.length || 1);
  const stats = new Map<
    number,
    { genre: Anime["genres"][number]; scores: number[] }
  >();
  for (const a of rated)
    for (const g of a.genres) {
      const stat = stats.get(g.id) ?? { genre: g, scores: [] };
      stat.scores.push(a.score!);
      stats.set(g.id, stat);
    }
  const favorites: Taste[] = [...stats.values()]
    .map(({ genre, scores }) => {
      const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      // Shrink towards the user's overall mean; ratings below 6 remain negative even for lenient/rating-sparse profiles.
      return {
        genre,
        mean,
        samples: scores.length,
        affinity:
          ((mean - Math.max(6, baseline - 0.5)) * scores.length) /
          (scores.length + 5),
      };
    })
    .sort((a, b) => b.affinity - a.affinity);
  return {
    rated: rated.length,
    confidence:
      rated.length < 5 ? "low" : rated.length < 20 ? "medium" : "high",
    favorites,
  };
}
const stop = new Set(
  "the a an and or to of in is it as for with his her their from on by at that this has he she they but be are was into its who when one after have can will been new no not".split(
    " ",
  ),
);
const words = (text: string | null) =>
  (text?.toLowerCase().match(/[a-záéíóúñ]{3,}/g) ?? []).filter(
    (x) => !stop.has(x),
  );
function semantic(profile: Profile) {
  const rated = profile.anime.filter(
    (a) => a.status === "completed" && a.score !== null,
  );
  const documents = rated.map((a) => [...new Set(words(a.synopsis))]);
  const df = new Map<string, number>();
  for (const doc of documents)
    for (const w of doc) df.set(w, (df.get(w) ?? 0) + 1);
  const vector = new Map<string, number>();
  for (const [i, a] of rated.entries())
    for (const w of documents[i]) {
      const idf = Math.log(1 + rated.length / (1 + (df.get(w) ?? 0)));
      vector.set(w, (vector.get(w) ?? 0) + ((a.score! - 6.5) / 3.5) * idf);
    }
  return (candidate: Anime) => {
    const tokens = [...new Set(words(candidate.synopsis))];
    if (!tokens.length || !rated.length) return 0;
    let dot = 0,
      norm = 0;
    for (const w of tokens) {
      const v = vector.get(w) ?? 0;
      dot += v;
    }
    for (const v of vector.values()) norm += v * v;
    return norm ? dot / Math.sqrt(norm * tokens.length) : 0;
  };
}
function similarity(a: Anime, b: Anime) {
  const set = new Set(a.genres.map((g) => g.id)),
    union = new Set([...set, ...b.genres.map((g) => g.id)]);
  return union.size
    ? b.genres.filter((g) => set.has(g.id)).length / union.size
    : 0;
}
export function eligible(
  profile: Profile,
  candidates: Anime[],
  preferences: Preferences,
  seen: number[] = [],
): Anime[] {
  const list = new Map(profile.anime.map((a) => [a.id, a]));
  const completed = new Set(
    profile.anime.filter((a) => a.status === "completed").map((a) => a.id),
  );
  const excluded = new Set(seen);
  return [...new Map(candidates.map((a) => [a.id, a])).values()].filter((a) => {
    const personal = list.get(a.id);
    const pending = personal?.status === "plan_to_watch";
    if (excluded.has(a.id) || (personal && !pending)) return false;
    if (
      (preferences.source === "pending" && !pending) ||
      (preferences.source === "discover" && personal)
    )
      return false;
    if (
      preferences.genres.length &&
      !a.genres.some((g) => preferences.genres.includes(g.id))
    )
      return false;
    if (a.prequels.some((id) => !completed.has(id))) return false;
    return true;
  });
}
export function recommend(
  profile: Profile,
  candidates: Anime[],
  preferences: Preferences,
  seen: number[] = [],
  weights = DEFAULT_WEIGHTS,
  limit: number = preferences.count,
): Results {
  const analysis = analyze(profile);
  const tastes = new Map(analysis.favorites.map((t) => [t.genre.id, t]));
  const semanticScore = semantic(profile);
  const favorites = profile.anime.filter(
    (a) => a.status === "completed" && (a.score ?? 0) >= 8,
  );
  const formats = new Map<string, number>();
  for (const a of favorites)
    if (a.format) formats.set(a.format, (formats.get(a.format) ?? 0) + 1);
  const pool = eligible(profile, candidates, preferences, seen);
  const personal = new Set(
    profile.anime.filter((a) => a.status === "plan_to_watch").map((a) => a.id),
  );
  const scored = pool.map((anime) => {
    const affinity =
      anime.genres.reduce((s, g) => s + (tastes.get(g.id)?.affinity ?? 0), 0) /
      Math.max(1, Math.sqrt(anime.genres.length));
    const filter = preferences.genres.length
      ? anime.genres.filter((g) => preferences.genres.includes(g.id)).length /
        preferences.genres.length
      : 0;
    const score =
      weights.affinity * affinity +
      weights.semantic * semanticScore(anime) +
      weights.quality * ((anime.mean ?? 6) - 6) +
      weights.filter * filter +
      (weights.format * (formats.get(anime.format ?? "") ?? 0)) /
        Math.max(1, favorites.length);
    return { anime, score };
  });
  const items: Recommendation[] = [];
  while (items.length < limit && scored.length) {
    scored.sort((a, b) => {
      const diversity = (x: Anime) =>
        items.length
          ? Math.max(...items.map((i) => similarity(x, i.anime)))
          : 0;
      return (
        b.score -
          weights.diversity * diversity(b.anime) -
          (a.score - weights.diversity * diversity(a.anime)) ||
        a.anime.id - b.anime.id
      );
    });
    const { anime, score } = scored.shift()!;
    const matching = anime.genres
      .map((g) => tastes.get(g.id))
      .filter((t): t is Taste => !!t && t.affinity > 0 && t.samples >= 2)
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, 2);
    const origin = personal.has(anime.id) ? "pending" : "discover";
    let explanation =
      analysis.confidence === "low"
        ? "Todavía hay pocas valoraciones para conocer tus gustos con confianza. Esta propuesta se basa en tus filtros y los datos del catálogo."
        : matching.length
          ? `Encaja con ${matching.map((t) => `${genreName(t.genre.name)} (tu media: ${t.mean.toFixed(1)}/10 en ${t.samples} títulos)`).join(" y ")}.`
          : "Es una alternativa para ampliar tus gustos, ordenada por similitud de sinopsis, formato y valoración del catálogo.";
    if (origin === "pending") explanation += " Ya lo tienes en tus pendientes.";
    items.push({
      anime,
      origin,
      explanation,
      rankingScore: Math.round(score * 1000) / 1000,
    });
  }
  const warnings: string[] = [];
  if (items.length < preferences.count)
    warnings.push(
      `Encontramos ${items.length} de las ${preferences.count} propuestas solicitadas. Los filtros, las listas, las precuelas y los títulos ya mostrados limitan las alternativas.`,
    );
  return {
    items,
    available: pool.length,
    warnings,
    analysis,
    explanationMode: "deterministic",
    engine: "classic",
  };
}

export function rankCandidates(
  profile: Profile,
  candidates: Anime[],
  preferences: Preferences,
  seen: number[] = [],
  limit = 30,
): Recommendation[] {
  return recommend(
    profile,
    candidates,
    preferences,
    seen,
    DEFAULT_WEIGHTS,
    Math.max(20, Math.min(40, limit)),
  ).items;
}
