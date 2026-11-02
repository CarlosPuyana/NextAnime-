// Operator-triggered, loopback-only check. No public test endpoint or backdoor.
import { randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import { createApp } from "../app.js";
import { AdminAuth, hashPassword } from "../admin.js";
import type { RankingService } from "../ai.js";
export async function checkGroqRecommendation(ranking: RankingService) {
  const password = randomBytes(32).toString("base64url");
  const auth = new AdminAuth({
    username: "runtime-check",
    passwordHash: await hashPassword(password),
    secret: randomBytes(40).toString("hex"),
  });
  const server = createApp(undefined, ranking, auth).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const post = (path: string, body: unknown, token?: string) =>
    fetch(`${url}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000),
    });
  try {
    const body = {
      username: "SadPuyana",
      mode: "groq",
      preferences: { genres: [], source: "both", count: 3 },
      consent: { adult: true, externalProcessing: true, version: "2026-11-01" },
    };
    const denied = await post("/recommendations", body);
    const login = await post("/admin/login", {
      username: "runtime-check",
      password,
    });
    const session = (await login.json()) as { token?: string };
    if (denied.status !== 401 || login.status !== 200 || !session.token)
      throw new Error("authentication_check_failed");
    const forbidden = await post(
      "/recommendations",
      { ...body, username: "Guest_123" },
      session.token,
    );
    if (forbidden.status !== 403) throw new Error("profile_check_failed");
    const response = await post("/recommendations", body, session.token);
    const result = (await response.json()) as any;
    console.info(
      JSON.stringify({
        event: "groq_recommendation_check",
        runtime: "Railway",
        status: response.status,
        authenticated: true,
        anonymousStatus: denied.status,
        forbiddenStatus: forbidden.status,
        valid: result.engine === "groq" && result.items?.length === 3,
        personalComparisons: result.items?.filter((item: any) =>
          item.explanation?.startsWith("Como te gust"),
        ).length,
        engine: result.engine,
        ...result.engineInfo,
        selected: result.items?.map((item: any) => ({
          id: item.anime.id,
          title: item.anime.title,
          explanation: item.explanation,
        })),
        warnings: result.warnings,
      }),
    );
  } catch (error) {
    const reason =
      (error as Error).name === "TimeoutError"
        ? "local_timeout"
        : "runtime_check_failed";
    console.info(
      JSON.stringify({
        event: "groq_recommendation_check",
        runtime: "Railway",
        valid: false,
        reason,
      }),
    );
  } finally {
    server.closeAllConnections();
    server.close();
  }
}
