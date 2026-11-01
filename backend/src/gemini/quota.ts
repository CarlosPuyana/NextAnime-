import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { GeminiConfig } from "./config.js";
export interface QuotaStore {
  reserve(
    now: number,
    subject: string,
    client: string,
    tokens: number,
    limits: GeminiConfig,
  ): boolean;
  circuit(now: number): boolean;
  failure(now: number, cooldown: number): void;
  success(): void;
}
export class SqliteQuotaStore implements QuotaStore {
  private db: DatabaseSync;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=1000;
      CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, value INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS circuit (id INTEGER PRIMARY KEY CHECK(id=1), failures INTEGER NOT NULL, retry_at INTEGER NOT NULL);
      INSERT OR IGNORE INTO circuit VALUES(1,0,0);`);
  }
  reserve(
    now: number,
    subject: string,
    client: string,
    tokens: number,
    limits: GeminiConfig,
  ): boolean {
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
    }).format(now);
    const buckets: [string, number, number][] = [
      [`calls:${day}`, 1, limits.dailyLimit],
      [`tokens:${day}`, tokens, limits.dailyTokens],
      [`profile:${day}:${subject}`, 1, limits.subjectLimit],
      [`client:${day}:${client}`, 1, limits.clientLimit],
      [`minute:${Math.floor(now / 60000)}`, 1, limits.minuteLimit],
    ];
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM counters WHERE expires <= ?").run(now);
      const read = this.db.prepare("SELECT value FROM counters WHERE key=?");
      if (
        buckets.some(
          ([key, amount, limit]) =>
            Number(
              (read.get(key) as { value: number } | undefined)?.value ?? 0,
            ) +
              amount >
            limit,
        )
      ) {
        this.db.exec("ROLLBACK");
        return false;
      }
      const write = this.db.prepare(
        "INSERT INTO counters VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=value+excluded.value",
      );
      for (const [key, amount] of buckets)
        write.run(
          key,
          amount,
          now + (key.startsWith("minute:") ? 120000 : 48 * 3600000),
        );
      this.db.exec("COMMIT");
      return true;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  circuit(now: number): boolean {
    return (
      Number(
        (
          this.db.prepare("SELECT retry_at FROM circuit WHERE id=1").get() as {
            retry_at: number;
          }
        ).retry_at,
      ) > now
    );
  }
  failure(now: number, cooldown: number) {
    this.db
      .prepare(
        "UPDATE circuit SET failures=failures+1, retry_at=CASE WHEN ? > 0 OR failures+1>=3 THEN ? ELSE retry_at END WHERE id=1",
      )
      .run(cooldown, now + (cooldown || 10 * 60000));
  }
  success() {
    this.db.exec("UPDATE circuit SET failures=0,retry_at=0 WHERE id=1");
  }
  close() {
    this.db.close();
  }
}
// Reuses the same atomic reservations and circuit breaker, without writing a file.
// This store deliberately resets when its process restarts; personal tests only.
export class MemoryQuotaStore extends SqliteQuotaStore {
  constructor() {
    super(":memory:");
  }
}
