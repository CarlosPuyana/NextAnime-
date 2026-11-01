import { writeFile } from "node:fs/promises";
const response = await fetch("https://myanimelist.net/anime.php", {
  signal: AbortSignal.timeout(20000),
});
if (!response.ok) throw new Error(`MAL HTTP ${response.status}`);
const html = await response.text();
const genres = [
  ...html.matchAll(
    /<input id="genre-(\d+)"[^>]*>[\s\S]*?<p>([^<]+) \([\d,]+\)<\/p>/g,
  ),
].map((m) => ({ id: Number(m[1]), name: m[2].replaceAll("&amp;", "&") }));
if (
  genres.length < 70 ||
  new Set(genres.map((g) => g.id)).size !== genres.length
)
  throw new Error("Catálogo incompleto: se conserva la versión anterior.");
await writeFile(
  "shared/catalog-genres.ts",
  `import type { Genre } from './types.js';\n// Verified from https://myanimelist.net/anime.php on ${new Date().toISOString().slice(0, 10)}.\nexport const CATALOG_GENRES: Genre[] = ${JSON.stringify(genres, null, 2)};\n`,
);
console.log(`${genres.length} géneros verificados.`);
