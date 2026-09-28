import { expect, test, type Page } from "@playwright/test";

const routes = [
  { path: "/", heading: "Hola, Ana" },
  { path: "/history/", heading: "Historial" },
  { path: "/progress/", heading: "Progreso" },
  { path: "/profile/", heading: "Ana" },
  { path: "/settings/", heading: "Ajustes" },
  { path: "/session/", heading: "Prepara una sesión" },
  { path: "/exercise/", heading: "Elige un ejercicio" },
];

async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener("controllerchange", () =>
        resolve(),
      );
    });
  });
}

test("la primera visita no se recarga y deja el manifest en caché", async ({
  page,
}) => {
  await page.goto("/onboarding/");
  // Lo escrito antes de que el service worker tome el control no se pierde.
  await page.getByPlaceholder("Tu nombre").fill("Ana");
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = (await manifestResponse.json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: Array<{ src: string }>;
  };
  expect(manifest).toMatchObject({ display: "standalone", start_url: "/" });
  for (const icon of manifest.icons) {
    expect((await page.request.get(icon.src)).ok(), icon.src).toBe(true);
  }

  await waitForServiceWorkerControl(page);
  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    const requests = (
      await Promise.all(
        names.map(async (name) => (await caches.open(name)).keys()),
      )
    ).flat();
    return requests.map((request) => new URL(request.url).pathname);
  });
  expect(cachedUrls).toContain("/manifest.webmanifest");
  await expect(page.getByPlaceholder("Tu nombre")).toHaveValue("Ana");
});

test("todas las pantallas funcionan sin conexión", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByPlaceholder("Tu nombre").fill("Ana");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder("175").fill("165");
  await page.getByPlaceholder("75,5").fill("60");
  await page.getByRole("button", { name: "Entrar en Hormé" }).click();
  await expect(page.getByRole("heading", { name: "Hola, Ana" })).toBeVisible();
  await waitForServiceWorkerControl(page);

  await context.setOffline(true);
  for (const route of routes) {
    await page.goto(route.path);
    await expect(
      page.getByRole("heading", { name: route.heading, exact: true }).first(),
      route.path,
    ).toBeVisible();
  }
  await context.setOffline(false);
});
