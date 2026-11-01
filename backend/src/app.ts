import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { ApiError } from "./errors.js";
import * as providers from "./providers.js";
import { analyze, eligible, rankCandidates } from "./recommender.js";
import { GeminiRankingService, type RankingService } from "./ai.js";
import { AdminAuth } from "./admin.js";
import type { Anime, Genre, Profile } from "../../shared/types.js";
export interface Services {
  loadProfile: (username: string) => Promise<Profile>;
  loadGenres: () => Promise<Genre[]>;
  loadDiscovery: (genres: number[]) => Promise<Anime[]>;
  loadDetails: (anime: Anime) => Promise<Anime>;
}
const usernameSchema = z.string().regex(/^[A-Za-z0-9_-]{2,16}$/);
const inputSchema = z.object({
  username: usernameSchema,
  preferences: z.object({
    genres: z.array(z.number().int().positive()).max(100),
    source: z.enum(["pending", "discover", "both"]),
    count: z.union([z.literal(3), z.literal(5), z.literal(10), z.literal(20)]),
  }),
  seen: z.array(z.number().int().positive()).max(10000).default([]),
  mode: z.enum(["classic", "gemini"]).default("classic"),
  consent: z
    .object({
      externalProcessing: z.literal(true),
      adult: z.literal(true),
      version: z.literal("2026-11-01"),
    })
    .optional(),
});
export function createApp(
  services: Services = providers,
  ranking: RankingService = new GeminiRankingService(),
  admin = new AdminAuth(),
) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  const allowed = (
    process.env.CORS_ORIGINS ??
    "https://carlospuyana.github.io,http://127.0.0.1:5173,http://localhost:5173"
  )
    .split(",")
    .map((x) => x.trim());
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowed.includes(origin)) cb(null, true);
        else cb(new ApiError(403, "Origen no autorizado."));
      },
    }),
  );
  app.use(express.json({ limit: "128kb" }));
  app.get("/api/health", (_req, res) =>
    res.json({
      status: "ok",
      version: "3.1.0",
      malConfigured: !!(process.env.MAL_CLIENT_ID || process.env.CLIENT_ID),
      aiConfigured: ranking.status().available,
      gemini: ranking.status(),
    }),
  );
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: "Demasiadas peticiones. Espera un minuto antes de continuar.",
      },
    }),
  );
  app.get("/api/genres", async (_req, res) =>
    res.json(await services.loadGenres()),
  );
  const loginLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error:
        "Demasiados intentos. Espera 15 minutos antes de volver a iniciar sesión.",
    },
  });
  const globalLoginLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    keyGenerator: () => "admin-login",
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "El acceso está temporalmente limitado. Inténtalo más tarde.",
    },
  });
  app.post(
    "/api/admin/login",
    loginLimit,
    globalLoginLimit,
    async (req, res) => {
      const input = z
        .object({
          username: z.string().min(1).max(64),
          password: z.string().min(1).max(256),
        })
        .parse(req.body);
      res
        .set("Cache-Control", "no-store")
        .json(await admin.login(input.username, input.password));
    },
  );
  app.get("/api/admin/session", (req, res) =>
    res.set("Cache-Control", "no-store").json(admin.session(req)),
  );
  app.post("/api/admin/logout", (req, res) => {
    admin.logout(req);
    res.set("Cache-Control", "no-store").json({ ok: true });
  });
  app.get("/api/capabilities", (_req, res) =>
    res
      .set("Cache-Control", "no-store")
      .json({ gemini: ranking.status(), consentVersion: "2026-11-01" }),
  );
  app.get("/api/profiles/:username", async (req, res) => {
    const username = usernameSchema.parse(req.params.username);
    const profile = await services.loadProfile(username);
    res
      .set("Cache-Control", "no-store")
      .json({ ...profile, analysis: analyze(profile) });
  });
  // Bound expensive concurrent recommendation requests independently of HTTP rate limits.
  let active = 0;
  app.post("/api/recommendations", async (req, res, next) => {
    if (active >= 4)
      return next(
        new ApiError(
          503,
          "El recomendador está ocupado. Inténtalo en unos segundos.",
        ),
      );
    active++;
    try {
      const { username, preferences, seen, mode, consent } = inputSchema.parse(
        req.body,
      );
      if (mode === "gemini") admin.requireGemini(req, username);
      const profile = await services.loadProfile(username);
      const warnings: string[] = [];
      const candidates =
        preferences.source === "discover"
          ? []
          : profile.anime.filter((a) => a.status === "plan_to_watch");
      if (preferences.source !== "pending") {
        try {
          candidates.push(
            ...(await services.loadDiscovery(preferences.genres)),
          );
        } catch (error) {
          if (preferences.source === "discover") throw error;
          warnings.push(
            "El catálogo de descubrimientos no está disponible; esta vez hemos utilizado solo tus pendientes.",
          );
        }
      }
      // Pre-filter before hydrating; verify relations for candidates that may actually be returned.
      const preliminary = rankCandidates(
        profile,
        candidates,
        preferences,
        seen,
      );
      const ordered = [
        ...preliminary.map((i) => i.anime),
        ...eligible(profile, candidates, preferences, seen),
      ];
      const unique = [...new Map(ordered.map((a) => [a.id, a])).values()];
      const verified: Anime[] = [];
      let attempted = 0,
        failed = 0;
      for (const anime of unique) {
        if (attempted >= 100) {
          warnings.push(
            "La búsqueda ha alcanzado su límite de consultas de esta ronda. Puedes cambiar los filtros para ampliar alternativas.",
          );
          break;
        }
        attempted++;
        try {
          const enriched = await services.loadDetails(anime);
          if (eligible(profile, [enriched], preferences, seen).length)
            verified.push(enriched);
        } catch {
          failed++;
        }
        if (
          verified.length >=
          (mode === "gemini" ? 40 : Math.max(preferences.count * 2, 30))
        )
          break;
      }
      if (failed)
        warnings.push(
          `${failed} candidatos no pudieron verificarse y se han omitido.`,
        );
      if (mode === "gemini") admin.requireGemini(req, username);
      const result = await ranking.rank({
        profile,
        candidates: verified,
        preferences,
        seen,
        mode,
        consent,
        client: req.ip ?? "unknown",
      });
      res
        .set("Cache-Control", "no-store")
        .json({ ...result, warnings: [...result.warnings, ...warnings] });
    } catch (error) {
      next(error);
    } finally {
      active--;
    }
  });
  app.use((_req, _res, next) => next(new ApiError(404, "Ruta no encontrada.")));
  app.use(
    (
      error: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof z.ZodError)
        return res
          .status(400)
          .json({ error: "Revisa el usuario y las preferencias enviadas." });
      if (error?.type === "entity.too.large")
        return res
          .status(413)
          .json({ error: "La solicitud es demasiado grande." });
      if (error instanceof SyntaxError)
        return res
          .status(400)
          .json({ error: "La solicitud no contiene JSON válido." });
      res.status(error instanceof ApiError ? error.status : 500).json({
        error:
          error instanceof ApiError
            ? error.message
            : "No pudimos completar la consulta. Vuelve a intentarlo.",
      });
    },
  );
  return app;
}
