import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const url = process.env.APP_URL ?? "http://127.0.0.1:5173/NextAnime-/";
const output = process.env.SCREENSHOT_DIR ?? ".local/screenshots";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole("heading", { name: /Cada gusto/ }).waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      ["art/nextanime-world.webp", "art/nextanime-avatars.webp"].map((src) => {
        const img = new Image();
        img.src = new URL(src, location.href).href;
        return img.decode();
      }),
    );
  });
  await page.screenshot({
    path: `${output}/perfiles.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: /^SadPuyana/ }).click();
  await page
    .getByRole("heading", { name: /Afinemos/ })
    .waitFor({ timeout: 180000 });
  await page
    .getByRole("button", { name: "Acción", exact: true })
    .waitFor({ timeout: 60000 });
  await page.screenshot({
    path: `${output}/preferencias.png`,
    fullPage: true,
    animations: "disabled",
  });
  // Exercise the requested default source: pending + real discoveries.
  await page.getByRole("button", { name: /Descubrir mis próximos/ }).click();
  await page
    .getByRole("heading", { name: /Hay un anime/ })
    .waitFor({ timeout: 180000 });
  const titles = await page.locator("article h2").allTextContents();
  if (titles.length < 1) throw new Error("No real recommendations returned");
  const links = await page
    .locator("article a")
    .evaluateAll((els) => els.map((a) => (a as HTMLAnchorElement).href));
  if (links.some((x) => !/^https:\/\/myanimelist.net\/anime\/\d+$/.test(x)))
    throw new Error("Invalid real MAL links");
  await page
    .locator("article img")
    .first()
    .evaluate(async (img) => {
      try {
        await (img as HTMLImageElement).decode();
      } catch {
        /* Report image diagnostics below. */
      }
    });
  const covers = await page
    .locator("article img")
    .evaluateAll((els) =>
      els.map((img) => ({
        url: (img as HTMLImageElement).src,
        loaded: (img as HTMLImageElement).naturalWidth > 0,
      })),
    );
  await page.screenshot({
    path: `${output}/resultados.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Recomendar otros" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Encontrando tu próxima historia" })
    .waitFor({ state: "hidden", timeout: 180000 });
  const second = await page.locator("article h2").allTextContents();
  if (second.some((t) => titles.includes(t)))
    throw new Error("Repeated recommendation in session");
  await page.getByRole("button", { name: "Cambiar preferencias" }).click();
  await page.getByRole("heading", { name: /Afinemos/ }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: /Cada gusto/ }).waitFor();
  const mobile = await browser.newPage({
    ...devices["iPhone 13"],
    defaultBrowserType: undefined,
  } as any);
  await mobile.goto(url);
  await mobile.getByRole("heading", { name: /Cada gusto/ }).waitFor();
  await mobile.screenshot({
    path: `${output}/movil.png`,
    fullPage: true,
    animations: "disabled",
  });
  if (
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
  )
    throw new Error("Horizontal overflow on mobile");
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    JSON.stringify(
      {
        url,
        firstRound: titles,
        secondRound: second,
        realMALLinks: links.length,
        covers,
        mobile: "passed",
        reload: "passed",
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
