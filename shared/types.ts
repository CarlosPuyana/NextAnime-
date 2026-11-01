export type ListStatus =
  "completed" | "watching" | "on_hold" | "dropped" | "plan_to_watch";
export interface Genre {
  id: number;
  name: string;
}
export interface Anime {
  id: number;
  title: string;
  picture: string | null;
  synopsis: string | null;
  genres: Genre[];
  episodes: number | null;
  year: number | null;
  mean: number | null;
  format: string | null;
  duration: number | null;
  status?: ListStatus;
  score: number | null;
  prequels: number[];
  relationsKnown: boolean;
}
export interface Profile {
  username: string;
  anime: Anime[];
  fetchedAt: string;
}
export type Source = "both" | "pending" | "discover";
export type RecommendationMode = "classic" | "gemini";
export interface AIConsent {
  externalProcessing: true;
  adult: true;
  version: "2026-11-01";
}
export interface GeminiAvailability {
  available: boolean;
  reason: string;
  message: string;
  model: string;
}
export interface Preferences {
  genres: number[];
  source: Source;
  count: 3 | 5 | 10 | 20;
}
export interface Taste {
  genre: Genre;
  mean: number;
  samples: number;
  affinity: number;
}
export interface Analysis {
  rated: number;
  confidence: "low" | "medium" | "high";
  favorites: Taste[];
}
export interface Recommendation {
  anime: Anime;
  origin: "pending" | "discover";
  explanation: string;
  rankingScore: number;
  reasons?: string[];
}
export interface Results {
  items: Recommendation[];
  available: number;
  warnings: string[];
  explanationMode: "deterministic" | "generative";
  analysis: Analysis;
  engine: RecommendationMode;
  engineInfo?: {
    requested: RecommendationMode;
    used: RecommendationMode;
    fallbackReason?: string;
    model?: string;
    cacheHit: boolean;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
  };
}
