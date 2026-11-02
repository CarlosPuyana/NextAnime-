import { z } from "zod";
import { Cache } from "./cache.js";
import { ApiError } from "./errors.js";
import { upstream } from "./providers.js";

export const ratingsInput = z.strictObject({
  names: z
    .array(
      z
        .string()
        .trim()
        .min(3)
        .max(120)
        .refine((s) => /[\p{L}\p{N}]/u.test(s) && !/\p{Cc}/u.test(s)),
    )
    .max(20),
});
export interface AnimeRating {
  id: number;
  name: string;
  score: number | null;
}
export type RatingResult =
  | AnimeRating
  | {
      id: null;
      name: string;
      score: null;
      error: "not_found" | "ambiguous";
      candidates?: AnimeRating[];
    };
type Resolution =
  | AnimeRating
  | { error: "not_found" | "ambiguous"; candidates?: AnimeRating[] };
const searchResponse = z.object({
  data: z.array(
    z.object({
      node: z.object({
        id: z.number().int().positive(),
        title: z.string().min(1),
        mean: z.number().min(0).max(10).nullable().optional(),
        alternative_titles: z
          .object({
            en: z.string().nullable().optional(),
            ja: z.string().nullable().optional(),
            synonyms: z.array(z.string()).nullable().optional(),
          })
          .nullable()
          .optional(),
      }),
    }),
  ),
});
const normalized = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

export class AnimeRatingsService {
  private cache = new Cache<Resolution>(60 * 60_000, 500);
  private inFlight = new Map<string, Promise<Resolution>>();
  constructor(private request: (url: string) => Promise<unknown> = upstream) {}

  private resolve(name: string): Promise<Resolution> {
    const key = normalized(name);
    const cached = this.cache.get(key);
    if (cached) return Promise.resolve(cached);
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    const work = (async (): Promise<Resolution> => {
      if (
        this.request === upstream &&
        !process.env.MAL_CLIENT_ID &&
        !process.env.CLIENT_ID
      )
        throw new ApiError(
          503,
          "Falta configurar MAL_CLIENT_ID en el backend.",
        );
      const query = new URLSearchParams({
        q: name,
        limit: "10",
        fields: "mean,alternative_titles",
        nsfw: "true",
      });
      const parsed = searchResponse.safeParse(
        await this.request(`https://api.myanimelist.net/v2/anime?${query}`),
      );
      if (!parsed.success)
        throw new ApiError(
          502,
          "MyAnimeList ha devuelto una búsqueda incompleta.",
        );
      const nodes = [
        ...new Map(
          parsed.data.data.map(({ node }) => [node.id, node]),
        ).values(),
      ];
      const aliases = (a: (typeof nodes)[number]) =>
        [
          a.title,
          a.alternative_titles?.en,
          a.alternative_titles?.ja,
          ...(a.alternative_titles?.synonyms || []),
        ]
          .filter((s): s is string => !!s)
          .map(normalized);
      const exact = nodes.filter((a) => aliases(a).includes(key));
      const containing = nodes.filter((a) =>
        aliases(a).some((s) => s.includes(key)),
      );
      const matches = exact.length
        ? exact
        : containing.length
          ? containing
          : nodes;
      const rating = (a: (typeof nodes)[number]): AnimeRating => ({
        id: a.id,
        name: a.title,
        score: a.mean && a.mean > 0 ? a.mean : null,
      });
      const result: Resolution = !matches.length
        ? { error: "not_found" }
        : matches.length === 1
          ? rating(matches[0])
          : { error: "ambiguous", candidates: matches.map(rating) };
      return this.cache.set(key, result);
    })().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, work);
    return work;
  }

  async lookup(names: string[]): Promise<RatingResult[]> {
    const results: RatingResult[] = [];
    for (const name of names) {
      const result = await this.resolve(name);
      results.push(
        "error" in result
          ? { id: null, name, score: null, ...result }
          : { ...result },
      );
    }
    return results;
  }
}
