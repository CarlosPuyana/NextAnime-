import { ApiError } from "./errors.js";
import { Cache } from "./cache.js";
import type { Anime, Genre, Profile } from "../../shared/types.js";
import { CATALOG_GENRES } from "../../shared/catalog-genres.js";
const MAL = "https://api.myanimelist.net/v2";
const JIKAN = "https://api.jikan.moe/v4";
const fields =
  "list_status,genres,synopsis,mean,num_episodes,start_date,media_type,average_episode_duration,related_anime";
export const validUsername = (value: string) =>
  /^[A-Za-z0-9_-]{2,16}$/.test(value);
const profiles = new Cache<Profile>(5 * 60_000, 50);
export interface PlanToWatch {
  data: {
    node: {
      id: number;
      title: string;
      main_picture?: { medium?: string; large?: string };
    };
    list_status: { status: string; [key: string]: unknown };
  }[];
  paging: Record<string, never>;
}
const pendingLists = new Cache<PlanToWatch>(5 * 60_000, 50);
const catalogCache = new Cache<Anime[]>(60 * 60_000, 20);
const details = new Cache<Anime>(24 * 60 * 60_000, 3000);
const inFlight = new Map<string, Promise<unknown>>();
const queues = new Map<string, Promise<unknown>>();
const lastRequest = new Map<string, number>();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function paced<T>(host: string, fn: () => Promise<T>): Promise<T> {
  const job = (queues.get(host) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      await wait(
        Math.max(
          0,
          (host.includes("jikan") ? 1100 : 150) -
            (Date.now() - (lastRequest.get(host) ?? 0)),
        ),
      );
      lastRequest.set(host, Date.now());
      return fn();
    });
  queues.set(
    host,
    job.catch(() => {}),
  );
  return job;
}
export async function upstream(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<any> {
  const parsed = new URL(url);
  if (
    ![new URL(MAL).host, new URL(JIKAN).host].includes(parsed.host) ||
    parsed.protocol !== "https:"
  )
    throw new ApiError(502, "URL de origen no permitida.");
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try {
      response = await paced(parsed.host, () =>
        fetcher(url, {
          headers:
            parsed.host === new URL(MAL).host
              ? {
                  "X-MAL-CLIENT-ID":
                    process.env.MAL_CLIENT_ID || process.env.CLIENT_ID || "",
                }
              : {},
          signal: AbortSignal.timeout(15000),
          redirect: "error",
        }),
      );
    } catch {
      if (attempt < 2) {
        await wait(500 * (attempt + 1));
        continue;
      }
      throw new ApiError(
        503,
        "La fuente de anime no responde. Vuelve a intentarlo en unos minutos.",
      );
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      const retry = Number(response.headers.get("retry-after"));
      await wait(
        Math.min(
          5000,
          Number.isFinite(retry) && retry > 0
            ? retry * 1000
            : 1000 * (attempt + 1),
        ),
      );
      continue;
    }
    if (response.status === 403)
      throw new ApiError(
        403,
        "La lista es privada o MyAnimeList no permite consultarla.",
      );
    if (response.status === 404)
      throw new ApiError(
        404,
        "No encontramos ese usuario o recurso en MyAnimeList.",
      );
    if (response.status === 401)
      throw new ApiError(
        503,
        "El acceso del servidor a MyAnimeList necesita configuración.",
      );
    if (!response.ok)
      throw new ApiError(
        503,
        "MyAnimeList está ocupado. Inténtalo de nuevo más tarde.",
      );
    try {
      return await response.json();
    } catch {
      throw new ApiError(
        502,
        "La fuente ha devuelto una respuesta incompleta.",
      );
    }
  }
}
export function normalizeMAL(node: any, list?: any): Anime {
  return {
    id: node.id,
    title: node.title,
    picture: node.main_picture?.large ?? node.main_picture?.medium ?? null,
    synopsis: node.synopsis || null,
    genres: node.genres ?? [],
    episodes: node.num_episodes || null,
    year: node.start_date ? Number(node.start_date.slice(0, 4)) || null : null,
    mean: node.mean || null,
    format: node.media_type || null,
    duration: node.average_episode_duration || null,
    score: list?.score >= 1 && list?.score <= 10 ? list.score : null,
    status: list?.status,
    prequels: (node.related_anime ?? [])
      .filter((r: any) => r.relation_type === "prequel")
      .map((r: any) => r.node.id),
    relationsKnown: Array.isArray(node.related_anime),
  };
}
async function coalesce<T>(key: string, work: () => Promise<T>): Promise<T> {
  if (inFlight.has(key)) return inFlight.get(key) as Promise<T>;
  const job = work().finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}
export async function loadPlanToWatch(
  username: string,
  request = upstream,
): Promise<PlanToWatch> {
  if (!validUsername(username))
    throw new ApiError(
      400,
      "Usa entre 2 y 16 letras, números, guiones o guiones bajos.",
    );
  if (
    !process.env.MAL_CLIENT_ID &&
    !process.env.CLIENT_ID &&
    request === upstream
  )
    throw new ApiError(503, "Falta configurar MAL_CLIENT_ID en el backend.");
  const key = username.toLowerCase();
  const cached = request === upstream ? pendingLists.get(key) : undefined;
  if (cached) return cached;
  return coalesce(`pending:${key}`, async () => {
    const entries = new Map<number, PlanToWatch["data"][number]>();
    let offset = 0;
    for (;;) {
      // Rebuild each URL rather than following an upstream-supplied paging URL.
      const page = await request(
        `${MAL}/users/${encodeURIComponent(username)}/animelist?status=plan_to_watch&limit=1000&offset=${offset}&fields=list_status&nsfw=true`,
      );
      if (!page || !Array.isArray(page.data))
        throw new ApiError(
          502,
          "MyAnimeList ha devuelto una lista incompleta.",
        );
      const previousSize = entries.size;
      for (const item of page.data) {
        if (
          !Number.isInteger(item?.node?.id) ||
          item.node.id <= 0 ||
          typeof item.node.title !== "string" ||
          !item.node.title.trim() ||
          item.list_status?.status !== "plan_to_watch"
        )
          throw new ApiError(
            502,
            "MyAnimeList ha devuelto pendientes inválidos.",
          );
        entries.set(item.node.id, item);
      }
      if (!page.paging?.next) break;
      if (entries.size === previousSize)
        throw new ApiError(
          502,
          "La paginación de MyAnimeList está incompleta.",
        );
      offset += page.data.length;
    }
    const result: PlanToWatch = { data: [...entries.values()], paging: {} };
    return request === upstream ? pendingLists.set(key, result) : result;
  });
}
export async function loadProfile(
  username: string,
  request = upstream,
): Promise<Profile> {
  if (!validUsername(username))
    throw new ApiError(
      400,
      "Usa entre 2 y 16 letras, números, guiones o guiones bajos.",
    );
  if (
    !process.env.MAL_CLIENT_ID &&
    !process.env.CLIENT_ID &&
    request === upstream
  )
    throw new ApiError(503, "Falta configurar MAL_CLIENT_ID en el backend.");
  const key = username.toLowerCase();
  const cached = request === upstream ? profiles.get(key) : undefined;
  if (cached) return cached;
  return coalesce(`profile:${key}`, async () => {
    const anime = new Map<number, Anime>();
    let offset = 0;
    for (;;) {
      const data = await request(
        `${MAL}/users/${encodeURIComponent(username)}/animelist?limit=1000&offset=${offset}&fields=${fields}&nsfw=true`,
      );
      if (!Array.isArray(data.data))
        throw new ApiError(
          502,
          "MyAnimeList ha devuelto una lista incompleta.",
        );
      for (const item of data.data) {
        if (
          !Number.isInteger(item.node?.id) ||
          !item.node?.title ||
          ![
            "completed",
            "watching",
            "on_hold",
            "dropped",
            "plan_to_watch",
          ].includes(item.list_status?.status)
        )
          throw new ApiError(
            502,
            "La lista recibida no contiene todos los estados necesarios.",
          );
        const a = normalizeMAL(item.node, item.list_status);
        anime.set(a.id, a);
      }
      if (!data.paging?.next) break;
      if (data.data.length === 0)
        throw new ApiError(
          502,
          "La paginación de MyAnimeList está incompleta.",
        );
      offset += data.data.length;
    }
    return profiles.set(key, {
      username,
      anime: [...anime.values()],
      fetchedAt: new Date().toISOString(),
    });
  });
}
export async function loadGenres(): Promise<Genre[]> {
  return CATALOG_GENRES;
}
export async function loadDiscovery(_genres: number[] = []): Promise<Anime[]> {
  const key = "official-catalog";
  const cached = catalogCache.get(key);
  if (cached) return cached;
  return coalesce(key, async () => {
    const all: Anime[] = [];
    const date = new Date(),
      year = date.getUTCFullYear(),
      season = ["winter", "spring", "summer", "fall"][
        Math.floor(date.getUTCMonth() / 3)
      ];
    const paths = [
      "/anime/ranking?ranking_type=all&limit=100",
      "/anime/ranking?ranking_type=bypopularity&limit=100",
      "/anime/ranking?ranking_type=bypopularity&limit=100&offset=100",
      "/anime/ranking?ranking_type=bypopularity&limit=100&offset=200",
      `/anime/season/${year}/${season}?limit=100&sort=anime_num_list_users`,
    ];
    // Bounded long-tail and historical seasons, with MAL IDs from the same official source.
    paths.push(
      "/anime/ranking?ranking_type=bypopularity&limit=100&offset=500",
      `/anime/season/${year - 1}/${season}?limit=100&sort=anime_num_list_users`,
      `/anime/season/${year - 2}/${season}?limit=100&sort=anime_num_list_users`,
    );
    for (const [index, path] of paths.entries()) {
      try {
        const data = await upstream(`${MAL}${path}&fields=${fields}`);
        if (!Array.isArray(data.data))
          throw new ApiError(502, "El catálogo está temporalmente incompleto.");
        all.push(
          ...data.data
            .filter((a: any) => Number.isInteger(a.node?.id) && a.node?.title)
            .map((a: any) => normalizeMAL(a.node)),
        );
      } catch (error) {
        if (index < 5) throw error;
        console.warn(
          JSON.stringify({ event: "discovery_optional_source_unavailable" }),
        );
      }
    }
    return catalogCache.set(key, [
      ...new Map(all.map((a) => [a.id, a])).values(),
    ]);
  });
}
export async function loadDetails(anime: Anime): Promise<Anime> {
  if (anime.relationsKnown) return anime;
  const cached = details.get(String(anime.id));
  if (cached) return { ...cached, status: anime.status, score: anime.score };
  const detail = await coalesce(`detail:${anime.id}`, async () => {
    const data = await upstream(`${MAL}/anime/${anime.id}?fields=${fields}`);
    return details.set(String(anime.id), normalizeMAL(data));
  });
  return { ...detail, status: anime.status, score: anime.score };
}
