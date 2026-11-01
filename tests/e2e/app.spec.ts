import { test, expect, type Page } from "@playwright/test";
import { profile, discoveries, action, romance } from "../fixtures";
import { analyze, recommend } from "../../backend/src/recommender";
import { PROFILES } from "../../frontend/src/config/profiles";
async function mock(page: Page) {
  await page.route("**/api/genres", (r) =>
    r.fulfill({ json: [action, romance, { id: 10, name: "Fantasy" }] }),
  );
  await page.route("**/api/profiles/*", (r) => {
    const name = decodeURIComponent(r.request().url().split("/").pop()!);
    return r.fulfill(
      name === "MissingUser"
        ? {
            status: 404,
            json: { error: "No encontramos ese usuario en MyAnimeList." },
          }
        : { json: { ...profile, username: name, analysis: analyze(profile) } },
    );
  });
  await page.route("**/api/recommendations", (r) => {
    const { preferences, seen } = r.request().postDataJSON();
    return r.fulfill({
      json: recommend(
        profile,
        [...profile.anime, ...discoveries],
        preferences,
        seen,
      ),
    });
  });
}
test.beforeEach(async ({ page }) => {
  await mock(page);
  await page.goto("./");
});
for (const p of PROFILES)
  test(`select profile ${p.displayName} using MAL ${p.malUsername}`, async ({
    page,
  }) => {
    const request = page.waitForRequest((r) =>
      r.url().endsWith(`/api/profiles/${p.malUsername}`),
    );
    await page
      .getByRole("button", {
        name: new RegExp(`^${p.displayName} @${p.malUsername}`),
      })
      .click();
    await request;
    await expect(
      page.getByRole("heading", { name: "Afinemos tu próxima historia." }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("button", {
          name: new RegExp(`${p.displayName}.*@${p.malUsername}`),
        })
        .first(),
    ).toBeVisible();
    await expect(page.locator(".app")).toHaveAttribute("data-profile-id", p.id);
    await expect(page.locator(".app")).toHaveCSS(
      "--profile-accent",
      p.accentColor,
    );
    await page.getByRole("button", { name: /Descubrir mis próximos/ }).click();
    await expect(
      page.getByRole("heading", { name: /Hay un anime/ }),
    ).toBeVisible();
    await expect(page.locator(".app")).toHaveAttribute("data-profile-id", p.id);
    await expect(page.locator(".results-heading")).toContainText(
      `propuestas para ${p.displayName}`,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
test("custom username validates and reports missing user", async ({ page }) => {
  await page.getByRole("button", { name: /Otro usuario/ }).click();
  await page.getByLabel("Tu nombre de MyAnimeList").fill("bad name");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("alert")).toContainText("Usa entre");
  await page.getByLabel("Tu nombre de MyAnimeList").fill("MissingUser");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("alert")).toContainText("No encontramos");
  await page.getByLabel("Tu nombre de MyAnimeList").fill("Custom_123");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: /Afinemos/ })).toBeVisible();
});
test("three screens, OR genres, preserved settings and no session repetitions", async ({
  page,
}) => {
  await page.getByRole("button", { name: /^SadPuyana/ }).click();
  await page.getByRole("button", { name: "Acción", exact: true }).click();
  await page.getByRole("button", { name: "Romance", exact: true }).click();
  await page.getByRole("button", { name: "3", exact: true }).click();
  await page.getByRole("button", { name: /Descubrir mis próximos/ }).click();
  await expect(page.locator("article")).toHaveCount(3);
  const first = await page.locator("article h2").allTextContents();
  await page.getByRole("button", { name: "Recomendar otros" }).click();
  await expect(page.locator("article")).toHaveCount(3);
  const second = await page.locator("article h2").allTextContents();
  expect(second.some((t) => first.includes(t))).toBe(false);
  await page.getByRole("button", { name: "Cambiar preferencias" }).click();
  await expect(
    page.getByRole("button", { name: "Acción", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "3", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Limpiar/ }).click();
  await expect(
    page.getByText("Todos los géneros", { exact: true }),
  ).toBeVisible();
});
for (const source of [
  "Mis pendientes",
  "Descubrir nuevos",
  "Lo mejor de ambos",
])
  test(`origin ${source}`, async ({ page }) => {
    await page.getByRole("button", { name: /^SadPuyana/ }).click();
    await page.getByRole("button", { name: new RegExp(`^${source}`) }).click();
    await page.getByRole("button", { name: /Descubrir mis próximos/ }).click();
    await expect(page.locator("article")).toHaveCount(5);
    if (source === "Mis pendientes")
      await expect(page.locator("article .origin.pending")).toHaveCount(5);
    if (source === "Descubrir nuevos")
      await expect(page.locator("article .origin.discover")).toHaveCount(5);
  });
test("responsive layout, keyboard navigation and local last profile", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /^SadPuyana/ })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "NextAnime, cambiar perfil" }),
  ).toBeFocused();
  await page.getByRole("button", { name: /^Nora @Noraaa_12/ }).click();
  await expect(page.getByRole("heading", { name: /Afinemos/ })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Nora @Noraaa_12.*Último perfil/ }),
  ).toBeVisible();
});
test("profile failure can be retried", async ({ page }) => {
  await page.route("**/api/profiles/*", (r) =>
    r.fulfill({ status: 503, json: { error: "La API no está disponible." } }),
  );
  await page.getByRole("button", { name: /^SadPuyana/ }).click();
  await expect(page.getByRole("alert")).toContainText("no está disponible");
  await expect(page.getByRole("button", { name: /^SadPuyana/ })).toBeEnabled();
});
for (const count of [10, 20])
  test(`request ${count} recommendations`, async ({ page }) => {
    await page.getByRole("button", { name: /^SadPuyana/ }).click();
    await page
      .getByRole("button", { name: String(count), exact: true })
      .click();
    await page.getByRole("button", { name: /Descubrir mis próximos/ }).click();
    await expect(page.locator("article")).toHaveCount(count);
  });
test("empty recommendations explain limitations without invalid filler", async ({
  page,
}) => {
  await page.route("**/api/recommendations", (r) =>
    r.fulfill({
      json: recommend({ ...profile, anime: [] }, [], {
        genres: [],
        source: "pending",
        count: 5,
      }),
    }),
  );
  await page.getByRole("button", { name: /^SadPuyana/ }).click();
  await page.getByRole("button", { name: /Descubrir mis próximos/ }).click();
  await expect(page.locator("article")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /Hemos explorado/ }),
  ).toBeVisible();
  await expect(page.getByText(/Encontramos 0 de las 5/)).toBeVisible();
});

test("custom profile stays neutral and never inherits a predefined portrait", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Otro usuario/ }).click();
  await page.getByLabel("Tu nombre de MyAnimeList").fill("Guest_123");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: /Afinemos/ })).toBeVisible();
  await expect(page.locator(".app")).toHaveAttribute(
    "data-profile-id",
    "custom",
  );
  await expect(page.locator(".profile-switch .guest-avatar")).toBeVisible();
  await expect(page.locator(".profile-switch")).toContainText("@Guest_123");
  await expect(page.locator(".profile-switch .identity-avatar")).toHaveCSS(
    "background-image",
    "none",
  );
});

test("selection has an explicit state during profile errors", async ({
  page,
}) => {
  await page.route("**/api/profiles/*", (r) =>
    r.fulfill({ status: 503, json: { error: "Error temporal de MAL." } }),
  );
  const card = page.getByRole("button", { name: /^Anita @aniitabombii09/ });
  await card.click();
  await expect(page.getByRole("alert")).toContainText("Error temporal");
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await expect(card).toHaveClass(/chosen/);
});
