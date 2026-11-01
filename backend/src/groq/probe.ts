import { groqRequest } from "./client.js";
export async function probeGroq() {
  const config = {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    timeoutMs: 45000,
  };
  if (!config.apiKey) {
    console.info(
      JSON.stringify({
        event: "groq_connectivity",
        ok: false,
        reason: "missing_key",
      }),
    );
    return;
  }
  try {
    const models = await groqRequest(config);
    if (!models.data.data?.some((m: { id: string }) => m.id === config.model)) {
      console.info(
        JSON.stringify({
          event: "groq_connectivity",
          ok: false,
          reason: "model_unavailable",
          model: config.model,
        }),
      );
      return;
    }
    const result = await groqRequest(config, {
      messages: [
        { role: "user", content: "Return JSON with ok equal to true." },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "connectivity",
          strict: true,
          schema: {
            type: "object",
            properties: { ok: { type: "boolean" } },
            required: ["ok"],
            additionalProperties: false,
          },
        },
      },
      reasoning_effort: "low",
      max_completion_tokens: 256,
      stream: false,
    });
    const valid =
      JSON.parse(result.data.choices?.[0]?.message?.content || "{}").ok ===
        true && result.data.choices?.[0]?.finish_reason === "stop";
    console.info(
      JSON.stringify({
        event: "groq_connectivity",
        runtime: "Railway",
        ok: valid,
        status: result.status,
        model: result.data.model,
        latencyMs: result.latencyMs,
        inputTokens: result.data.usage?.prompt_tokens,
        outputTokens: result.data.usage?.completion_tokens,
        limits: result.limits,
      }),
    );
  } catch (error) {
    const e = error as { status?: number; code?: string; name?: string };
    console.info(
      JSON.stringify({
        event: "groq_connectivity",
        runtime: "Railway",
        ok: false,
        status: e.status,
        code: e.code,
        reason:
          e.name === "TimeoutError" ? "local_timeout" : "provider_or_network",
      }),
    );
  }
}
