import { createHmac, pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request } from "express";
import { ApiError } from "./errors.js";

const derive = promisify(pbkdf2);
const TTL = 4 * 60 * 60_000;
const ITERATIONS = 600_000;
export const ADMIN_PROFILES = new Set([
  "SadPuyana",
  "Noraaa_12",
  "Antoniioman",
  "aniitabombii09",
]);
export async function hashPassword(password: string) {
  const salt = randomBytes(24).toString("base64url");
  const hash = await derive(password, salt, ITERATIONS, 32, "sha256");
  return `pbkdf2-sha256$${ITERATIONS}$${salt}$${hash.toString("base64url")}`;
}
export interface AdminConfig {
  username: string;
  passwordHash: string;
  secret: string;
}
export function adminConfig(env: NodeJS.ProcessEnv = process.env): AdminConfig {
  return {
    username: env.ADMIN_USERNAME || "",
    passwordHash: env.ADMIN_PASSWORD_HASH || "",
    secret: env.ADMIN_SESSION_SECRET || "",
  };
}
export class AdminAuth {
  private sessions = new Map<string, number>();
  constructor(
    private config = adminConfig(),
    private now = () => Date.now(),
  ) {}
  configured() {
    return !!(
      this.config.username &&
      this.config.secret.length >= 32 &&
      /^pbkdf2-sha256\$600000\$[A-Za-z0-9_-]{32}\$[A-Za-z0-9_-]{43}$/.test(
        this.config.passwordHash,
      )
    );
  }
  private sign(value: string) {
    return createHmac("sha256", this.config.secret)
      .update(this.config.passwordHash)
      .update("\0")
      .update(value)
      .digest("base64url");
  }
  private clean() {
    for (const [id, expiry] of this.sessions)
      if (expiry <= this.now()) this.sessions.delete(id);
  }
  async login(username: string, password: string) {
    if (!this.configured())
      throw new ApiError(
        503,
        "El acceso de administrador necesita configurar su contraseña privada en Railway.",
      );
    const [, , salt, expected] = this.config.passwordHash.split("$");
    // Derive even for an unknown username to avoid a username timing oracle.
    const actual = await derive(password, salt, ITERATIONS, 32, "sha256");
    const correctUser = createHmac("sha256", this.config.secret)
      .update(username)
      .digest();
    const expectedUser = createHmac("sha256", this.config.secret)
      .update(this.config.username)
      .digest();
    if (
      !timingSafeEqual(actual, Buffer.from(expected, "base64url")) ||
      !timingSafeEqual(correctUser, expectedUser)
    )
      throw new ApiError(401, "Usuario o contraseña incorrectos.");
    this.clean();
    if (this.sessions.size >= 100)
      this.sessions.delete(this.sessions.keys().next().value!);
    const id = randomBytes(24).toString("base64url");
    const expiresAt = this.now() + TTL;
    this.sessions.set(id, expiresAt);
    const payload = Buffer.from(JSON.stringify({ id, expiresAt })).toString(
      "base64url",
    );
    return { token: `${payload}.${this.sign(payload)}`, expiresAt };
  }
  private payload(req: Request): { id: string; expiresAt: number } | null {
    if (!this.configured()) return null;
    const token = req
      .get("Authorization")
      ?.match(/^Bearer ([A-Za-z0-9_.-]{1,512})$/)?.[1];
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    const expected = this.sign(data);
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return null;
    try {
      const value = JSON.parse(Buffer.from(data, "base64url").toString());
      this.clean();
      if (
        typeof value.id !== "string" ||
        !Number.isSafeInteger(value.expiresAt) ||
        value.expiresAt <= this.now() ||
        this.sessions.get(value.id) !== value.expiresAt
      )
        return null;
      return value;
    } catch {
      return null;
    }
  }
  session(req: Request) {
    const value = this.payload(req);
    return {
      authenticated: !!value,
      configured: this.configured(),
      expiresAt: value?.expiresAt ?? null,
    };
  }
  logout(req: Request) {
    const value = this.payload(req);
    if (value) this.sessions.delete(value.id);
  }
  requireGemini(req: Request, username: string) {
    if (!this.payload(req))
      throw new ApiError(
        401,
        "Inicia sesión como administrador para utilizar Gemini experimental.",
      );
    if (!ADMIN_PROFILES.has(username))
      throw new ApiError(
        403,
        "Gemini experimental solo admite los cuatro perfiles predefinidos.",
      );
  }
}
