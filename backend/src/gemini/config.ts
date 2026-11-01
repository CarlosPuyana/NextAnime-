import { resolve, relative, isAbsolute } from "node:path";
import { randomBytes } from "node:crypto";
import type { GeminiAvailability } from "../../../shared/types.js";
export interface GeminiConfig {
  enabled: boolean;
  personalTestMode: boolean;
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
  minuteTokens?: number;
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
  const personalTestMode = env.GEMINI_PERSONAL_TEST_MODE === "true";
  const mount = env.RAILWAY_VOLUME_MOUNT_PATH;
  const inside = mount && path ? relative(resolve(mount), resolve(path)) : null;
  const durable =
    env.NODE_ENV !== "production"
      ? !!path
      : !!(inside !== null && !inside.startsWith("..") && !isAbsolute(inside));
  return {
    enabled: env.GEMINI_ENABLED === "true",
    personalTestMode,
    apiKey: env.GEMINI_API_KEY || "",
    model: env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    region: env.GEMINI_DEPLOYMENT_REGION === "other" ? "other" : "EEA",
    freeTierVerified: env.GEMINI_FREE_TIER_VERIFIED === "true",
    audienceApproved: env.GEMINI_ADULT_AUDIENCE_APPROVED === "true",
    keyRotated: env.GEMINI_KEY_ROTATED === "true",
    quotaPath: path,
    quotaSecret:
      (env.GEMINI_QUOTA_SECRET?.length ?? 0) >= 32
        ? env.GEMINI_QUOTA_SECRET!
        : personalTestMode
          ? randomBytes(32).toString("hex")
          : "",
    durable,
    dailyLimit: bounded(env.GEMINI_DAILY_LIMIT, 6, 0, 6),
    subjectLimit: bounded(env.GEMINI_PROFILE_DAILY_LIMIT, 6, 0, 6),
    clientLimit: bounded(env.GEMINI_CLIENT_DAILY_LIMIT, 6, 0, 6),
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
  // Keep the public EEA guard. Owner-authorized personal testing is an explicit
  // opt-in; it does not assert provider eligibility or bypass Google's limits.
  if (config.region === "EEA" && !config.personalTestMode)
    return unavailable(
      "region_policy",
      "Gemini está preparado, pero no se activa: Google exige servicios de pago para ofrecerlo a usuarios del EEE. NextAnime mantiene el presupuesto de 0 € y el modo clásico.",
    );
  if (!config.enabled)
    return unavailable(
      "disabled",
      "Gemini está desactivado. Puedes utilizar la recomendación clásica.",
    );
  if (!config.apiKey || (!config.personalTestMode && !config.keyRotated))
    return unavailable(
      "credential",
      "Falta una credencial nueva y validada de Gemini.",
    );
  if (!config.personalTestMode && !config.freeTierVerified)
    return unavailable(
      "free_tier_unverified",
      "La cuota gratuita de este proyecto no está verificada.",
    );
  if (!config.personalTestMode && !config.audienceApproved)
    return unavailable(
      "audience_policy",
      "La disponibilidad de Gemini requiere una audiencia adulta y una revisión de sus condiciones.",
    );
  if (
    !config.personalTestMode &&
    (!config.quotaPath || !config.durable || config.quotaSecret.length < 32)
  )
    return unavailable(
      "quota_storage",
      "Gemini necesita un control persistente de cuota antes de poder activarse.",
    );
  if (!config.personalTestMode)
    return unavailable(
      "personal_mode_required",
      "Gemini solo está habilitado para pruebas personales autenticadas.",
    );
  if (config.dailyLimit === 0 || config.dailyTokens === 0)
    return unavailable("quota", "La cuota de Gemini está desactivada.");
  return {
    available: true,
    reason: "ready",
    message:
      config.durable && config.quotaPath
        ? `Pruebas personales autenticadas: máximo ${config.dailyLimit} llamadas al día, con consentimiento y cuota persistente.`
        : `Pruebas personales autenticadas: máximo ${config.dailyLimit} llamadas al día por ejecución. Los contadores en memoria se reinician con el proceso; Google aplica además sus propias cuotas.`,
    model: config.model,
  };
}
