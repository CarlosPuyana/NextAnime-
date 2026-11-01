import { resolve, relative, isAbsolute } from "node:path";
import type { GeminiAvailability } from "../../../shared/types.js";
export interface GeminiConfig {
  enabled: boolean;
  apiKey: string;
  model: string;
  region: "EEA" | "other";
  freeTierVerified: boolean;
  audienceApproved: boolean;
  keyRotated: boolean;
  quotaPath: string;
  quotaSecret: string;
  durable: boolean;
  dailyLimit: number;
  subjectLimit: number;
  clientLimit: number;
  minuteLimit: number;
  maxConcurrent: number;
  dailyTokens: number;
  timeoutMs: number;
  maxOutputTokens: number;
  cacheTtlMs: number;
}
const bounded = (
  s: string | undefined,
  value: number,
  min: number,
  max: number,
) =>
  Math.min(
    max,
    Math.max(
      min,
      Number.isFinite(Number(s)) && s !== "" && s !== undefined
        ? Math.floor(Number(s))
        : value,
    ),
  );
export function readGeminiConfig(
  env: NodeJS.ProcessEnv = process.env,
): GeminiConfig {
  const path = env.GEMINI_QUOTA_DB || "";
  const mount = env.RAILWAY_VOLUME_MOUNT_PATH;
  const inside = mount && path ? relative(resolve(mount), resolve(path)) : null;
  const durable =
    env.NODE_ENV !== "production"
      ? !!path
      : !!(inside !== null && !inside.startsWith("..") && !isAbsolute(inside));
  return {
    enabled: env.GEMINI_ENABLED === "true",
    apiKey: env.GEMINI_API_KEY || "",
    model: env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    region: env.GEMINI_DEPLOYMENT_REGION === "other" ? "other" : "EEA",
    freeTierVerified: env.GEMINI_FREE_TIER_VERIFIED === "true",
    audienceApproved: env.GEMINI_ADULT_AUDIENCE_APPROVED === "true",
    keyRotated: env.GEMINI_KEY_ROTATED === "true",
    quotaPath: path,
    quotaSecret: env.GEMINI_QUOTA_SECRET || "",
    durable,
    dailyLimit: bounded(env.GEMINI_DAILY_LIMIT, 3, 0, 3),
    subjectLimit: bounded(env.GEMINI_PROFILE_DAILY_LIMIT, 3, 0, 10),
    clientLimit: bounded(env.GEMINI_CLIENT_DAILY_LIMIT, 3, 0, 10),
    minuteLimit: bounded(env.GEMINI_RPM_LIMIT, 2, 1, 10),
    maxConcurrent: 1,
    dailyTokens: bounded(env.GEMINI_DAILY_TOKEN_LIMIT, 200000, 0, 500000),
    timeoutMs: bounded(env.GEMINI_TIMEOUT_MS, 12000, 100, 20000),
    maxOutputTokens: 8192,
    cacheTtlMs: 30 * 60_000,
  };
}
export function availability(config: GeminiConfig): GeminiAvailability {
  const unavailable = (reason: string, message: string) => ({
    available: false,
    reason,
    message,
    model: config.model,
  });
  // This implementation deliberately supports only a verified, unbilled free-tier deployment.
  // EEA end-user availability requires Paid Services under Google's current terms.
  if (config.region === "EEA")
    return unavailable(
      "region_policy",
      "Gemini está preparado, pero no se activa: Google exige servicios de pago para ofrecerlo a usuarios del EEE. NextAnime mantiene el presupuesto de 0 € y el modo clásico.",
    );
  if (!config.enabled)
    return unavailable(
      "disabled",
      "Gemini está desactivado. Puedes utilizar la recomendación clásica.",
    );
  if (!config.apiKey || !config.keyRotated)
    return unavailable(
      "credential",
      "Falta una credencial nueva y validada de Gemini.",
    );
  if (!config.freeTierVerified)
    return unavailable(
      "free_tier_unverified",
      "La cuota gratuita de este proyecto no está verificada.",
    );
  if (!config.audienceApproved)
    return unavailable(
      "audience_policy",
      "La disponibilidad de Gemini requiere una audiencia adulta y una revisión de sus condiciones.",
    );
  if (!config.quotaPath || !config.durable || config.quotaSecret.length < 32)
    return unavailable(
      "quota_storage",
      "Gemini necesita un control persistente de cuota antes de poder activarse.",
    );
  if (config.dailyLimit === 0 || config.dailyTokens === 0)
    return unavailable("quota", "La cuota de Gemini está desactivada.");
  return {
    available: true,
    reason: "ready",
    message:
      "Análisis externo opcional con consentimiento. La recomendación clásica siempre está disponible.",
    model: config.model,
  };
}
