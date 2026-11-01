import { writeFile, mkdir } from "node:fs/promises";
import { loadProfile } from "../backend/src/providers.js";
import {
  rankCandidates,
  ALGORITHM_VERSION,
} from "../backend/src/recommender.js";
import { representativeExamples } from "../backend/src/gemini/context.js";
import {
  availability,
  readGeminiConfig,
} from "../backend/src/gemini/config.js";
import { profile as fixture } from "../tests/fixtures.js";
import type { Anime, Profile } from "../shared/types.js";

function diversity(anime: Anime[]) {
  let total = 0,
    pairs = 0;
  for (let i = 0; i < anime.length; i++)
    for (let j = i + 1; j < anime.length; j++) {
      const a = new Set(anime[i].genres.map((g) => g.id)),
        b = new Set(anime[j].genres.map((g) => g.id));
      total +=
        1 -
        [...a].filter((x) => b.has(x)).length /
          Math.max(1, new Set([...a, ...b]).size);
      pairs++;
    }
  return pairs ? total / pairs : 0;
}
function evaluate(profile: Profile) {
  const rated = profile.anime.filter(
    (a) => a.status === "completed" && (a.score ?? 0) >= 1,
  );
  const positive = representativeExamples(
    rated
      .filter((a) => a.score! >= 8)
      .sort((a, b) => b.score! - a.score! || a.id - b.id),
    8,
  );
  const negative = representativeExamples(
    rated
      .filter((a) => a.score! <= 5)
      .sort((a, b) => a.score! - b.score! || a.id - b.id),
    8,
  );
  const holdout = [...positive, ...negative],
    ids = new Set(holdout.map((a) => a.id));
  const train = {
    ...profile,
    anime: profile.anime.filter((a) => !ids.has(a.id)),
  };
  const candidates = holdout.map((a) => ({
    ...a,
    status: undefined,
    score: null,
  }));
  const start = performance.now();
  const ranked = rankCandidates(
    train,
    candidates,
    { genres: [], source: "discover", count: 10 },
    [],
    40,
  ).map((i) => i.anime);
  const latencyMs = performance.now() - start;
  const position = new Map(ranked.map((a, i) => [a.id, i]));
  let correct = 0,
    pairs = 0;
  for (const a of positive)
    for (const b of negative) {
      if (position.has(a.id) && position.has(b.id)) {
        pairs++;
        if (position.get(a.id)! < position.get(b.id)!) correct++;
      }
    }
  const labels = new Map(holdout.map((a) => [a.id, a.score!]));
  const dcg = (scores: number[]) =>
    scores
      .slice(0, 10)
      .reduce(
        (s, value, i) => s + (2 ** (value / 10) - 1) / Math.log2(i + 2),
        0,
      );
  const ideal = dcg([...labels.values()].sort((a, b) => b - a));
  return {
    profile: profile.username,
    rated: rated.length,
    heldOutPositive: positive.length,
    heldOutNegative: negative.length,
    eligibleHeldOut: ranked.length,
    pairwiseAccuracy: pairs ? correct / pairs : null,
    ndcg10: ideal ? dcg(ranked.map((a) => labels.get(a.id)!)) / ideal : null,
    diversity: diversity(ranked),
    latencyMs: Math.round(latencyMs * 100) / 100,
    validIds: ranked.every((a) => ids.has(a.id)),
    trainingLeakage: ranked.some((a) => train.anime.some((t) => t.id === a.id)),
  };
}
const live = process.argv.includes("--live");
const profiles = live
  ? await Promise.all(
      ["SadPuyana", "Noraaa_12", "Antoniioman", "aniitabombii09"].map((name) =>
        loadProfile(name),
      ),
    )
  : [fixture];
const report = {
  date: new Date().toISOString(),
  source: live ? "MAL real public lists" : "deterministic fixture",
  algorithm: ALGORITHM_VERSION,
  classic: profiles.map(evaluate),
  gemini: {
    status: "not_evaluated",
    availability: availability(readGeminiConfig()).reason,
    realCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    qualityConclusion:
      "No se puede afirmar una mejora de calidad sin evaluación real de Gemini. Los mocks verifican mecánica, filtros, fallbacks y cuotas, no calidad narrativa.",
  },
};
await mkdir(".local", { recursive: true });
await writeFile(
  ".local/recommendation-evaluation.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
