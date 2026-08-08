import { expect, test } from "@playwright/test";

test("onboarding, entrenamiento, medición, progreso, offline y copia", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding\/?$/);

  await page.getByPlaceholder("Tu nombre").fill("Javier");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder("175").fill("181");
  await page.getByPlaceholder("75,5").fill("78,4");
  await page.getByRole("button", { name: "Entrar en Hormé" }).click();
  await expect(
    page.getByRole("heading", { name: "Hola, Javier" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByRole("button", { name: "Fuerza" }).click();
  await page
    .getByLabel("Ejercicio a añadir")
    .selectOption({ label: "Peso muerto · Deadlift" });
  await page.getByRole("button", { name: "Añadir ejercicio" }).click();
  await page.getByLabel("Número de series").fill("3");
  await page.getByLabel("Repeticiones por serie").fill("1");
  await page.getByLabel("Carga por serie").fill("115");
  await page.getByRole("button", { name: "Crear iguales" }).click();
  await expect(page.locator(".set-row")).toHaveCount(3);
  await page.getByRole("button", { name: "Eliminar serie 2" }).click();
  await expect(page.locator(".set-row")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Eliminar serie 2" }),
  ).toBeVisible();
  for (const checkbox of await page.locator(".set-checkbox input").all()) {
    await checkbox.check();
  }
  await page.getByRole("button", { name: "Finalizar" }).click();
  await expect(page.getByText("Sesión finalizada").first()).toBeVisible();

  await page.getByRole("link", { name: "Abrir perfil de usuario" }).click();
  await page.locator("#measurement-form input[type=date]").fill("2026-08-08");
  await page
    .locator("#measurement-form input[inputmode=decimal]")
    .nth(1)
    .fill("77,9");
  await page.getByRole("button", { name: "Añadir medición" }).click();
  await expect(page.getByText("Medición añadida")).toBeVisible();

  await page.getByRole("link", { name: "Progreso" }).click();
  await expect(
    page.getByRole("heading", { name: "Peso muerto" }),
  ).toBeVisible();

  const registrationReady = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          {
            once: true,
          },
        );
      });
    }
    return true;
  });
  expect(registrationReady).toBe(true);
  const offlineState = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const cachedRequests = (
      await Promise.all(
        cacheNames.map(async (cacheName) =>
          (await caches.open(cacheName)).keys(),
        ),
      )
    ).flat();
    return {
      isControlled: navigator.serviceWorker.controller !== null,
      hasProgressDocument: cachedRequests.some(
        (request) => new URL(request.url).pathname === "/progress/",
      ),
    };
  });
  expect(offlineState).toEqual({
    isControlled: true,
    hasProgressDocument: true,
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Progreso", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Peso muerto" }),
  ).toBeVisible();
  await context.setOffline(false);

  await page.getByRole("link", { name: "Ajustes" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar copia actual" }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).not.toBeNull();
  await page.locator('input[type="file"]').setInputFiles(backupPath ?? "");
  await expect(page.getByText("Javier").last()).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Reemplazar todos los datos" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hola, Javier" }),
  ).toBeVisible();
});
