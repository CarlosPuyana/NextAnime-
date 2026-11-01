export interface GroqConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
}
export interface GroqLimits {
  requests?: number;
  tokens?: number;
  remainingTokens?: number;
  resetTokens?: string;
}
export class GroqHTTPError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    public retryAfterMs: number,
    public limits?: GroqLimits,
  ) {
    super(JSON.stringify({ error: { status: code || "PROVIDER_ERROR" } }));
  }
}
export async function groqRequest(
  config: GroqConfig,
  body?: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const start = Date.now();
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const response = await fetch(
    `https://api.groq.com/openai/v1/${body ? "chat/completions" : "models"}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify({ model: config.model, ...body }) : undefined,
      signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    },
  );
  const numeric = (name: string) => {
    const value = response.headers.get(name);
    return value && /^\d+$/.test(value) ? Number(value) : undefined;
  };
  const limits: GroqLimits = {
    requests: numeric("x-ratelimit-limit-requests"),
    tokens: numeric("x-ratelimit-limit-tokens"),
    remainingTokens: numeric("x-ratelimit-remaining-tokens"),
    resetTokens: response.headers.get("x-ratelimit-reset-tokens") || undefined,
  };
  let data;
  try {
    data = await response.json();
  } catch {
    if (!response.ok)
      throw new GroqHTTPError(
        response.status,
        "INVALID_PROVIDER_BODY",
        60000,
        limits,
      );
    throw new SyntaxError("Invalid Groq response JSON");
  }
  if (!response.ok) {
    const raw = data?.error?.code || data?.error?.type;
    const code =
      typeof raw === "string" && /^[A-Za-z0-9_]{1,80}$/.test(raw)
        ? raw
        : undefined;
    const retry = Number(response.headers.get("retry-after"));
    throw new GroqHTTPError(
      response.status,
      code,
      Number.isFinite(retry) && retry > 0
        ? Math.min(retry * 1000, 86400000)
        : 60000,
      limits,
    );
  }
  return {
    data,
    status: response.status,
    latencyMs: Date.now() - start,
    limits,
  };
}
