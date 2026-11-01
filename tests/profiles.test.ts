import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import {
  PROFILES,
  CUSTOM_PROFILE,
  resolveProfile,
} from "../frontend/src/config/profiles";

describe("centralized profile identities", () => {
  it("keeps display names separate from the exact canonical MAL usernames", () => {
    expect(PROFILES.map((p) => [p.displayName, p.malUsername])).toEqual([
      ["SadPuyana", "SadPuyana"],
      ["Nora", "Noraaa_12"],
      ["Anto", "Antoniioman"],
      ["Anita", "aniitabombii09"],
    ]);
    expect(new Set(PROFILES.map((p) => p.id)).size).toBe(4);
  });
  it("resolves names case-insensitively without changing the configured MAL username", () => {
    expect(resolveProfile("nORaaa_12").id).toBe("nora");
    expect(resolveProfile("ANTONIIOMAN").malUsername).toBe("Antoniioman");
  });
  it("keeps unknown users neutral rather than falling back to SadPuyana", () => {
    const guest = resolveProfile("Guest_123");
    expect(guest.id).toBe("custom");
    expect(guest.displayName).toBe("Guest_123");
    expect(guest.malUsername).toBe("Guest_123");
    expect(guest.avatarAsset).toBeNull();
    expect(resolveProfile()).toBe(CUSTOM_PROFILE);
  });
  it("ships real independent portrait assets and complete editorial metadata", () => {
    expect(new Set(PROFILES.map((p) => p.avatarAsset)).size).toBe(4);
    for (const p of PROFILES) {
      expect(existsSync(`frontend/public/${p.avatarAsset}`)).toBe(true);
      expect(existsSync(`frontend/public/${p.heroAsset}`)).toBe(true);
      expect(p.description.length).toBeGreaterThan(30);
      expect(p.inspirations.length).toBeGreaterThan(0);
      expect(p.tagline).toBeTruthy();
      expect(p.subtitle).toBeTruthy();
      expect(p.palette.primary).toBe(p.accentColor);
      expect(Object.values(p.microcopy).every(Boolean)).toBe(true);
    }
  });
});
