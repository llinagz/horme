import { expect, test } from "@playwright/test";
import {
  completeOnboarding,
  startStrengthSession,
  waitForServiceWorkerControl,
} from "./helpers";

test("onboarding, entrenamiento, medición, progreso, offline y copia", async ({
  page,
  context,
}) => {
  await completeOnboarding(page);

  await startStrengthSession(page, "peso muerto", /Peso muerto/);
  // Sin historial se crean tres series vacías; se ajusta la primera.
  await expect(
    page.getByRole("button", { name: /^Completar Serie/ }),
  ).toHaveCount(3);
  await page.getByLabel("Carga", { exact: true }).fill("115");
  await page.getByLabel("Carga", { exact: true }).blur();
  await page.getByRole("button", { name: /Sumar 1 rep/ }).click();
  await page.getByRole("button", { name: /^Completar Serie 1/ }).click();

  // Borrar una serie se puede deshacer.
  await page.getByRole("button", { name: "Eliminar serie 2" }).click();
  await expect(
    page.getByRole("button", { name: /^Completar Serie 3/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(
    page.getByRole("button", { name: /^Completar Serie 3/ }),
  ).toHaveCount(1);

  // La serie siguiente hereda carga y repeticiones de la completada.
  await page.getByRole("button", { name: /^Completar Serie 2/ }).click();
  await expect(
    page.getByRole("button", { name: /^Desmarcar Serie 2: 1 × 115 kg/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finalizar" }).click();
  await expect(page.getByText("Sesión finalizada").first()).toBeVisible();

  await page.getByRole("link", { name: "Abrir perfil de Javier" }).click();
  await page.locator("#measurement-form input[type=date]").fill("2026-08-08");
  await page.locator("#measurement-form").getByLabel("Peso").fill("77,9");
  await page.getByRole("button", { name: "Añadir medición" }).click();
  await expect(page.getByText("Medición añadida")).toBeVisible();

  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Progreso" })
    .click();
  await expect(page.getByRole("link", { name: /Peso muerto/ })).toBeVisible();

  await waitForServiceWorkerControl(page);
  const hasProgressDocument = await page.evaluate(async () => {
    const names = await caches.keys();
    const requests = (
      await Promise.all(
        names.map(async (name) => (await caches.open(name)).keys()),
      )
    ).flat();
    return requests.some(
      (request) => new URL(request.url).pathname === "/progress/",
    );
  });
  expect(hasProgressDocument).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Progreso", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Peso muerto/ })).toBeVisible();
  await context.setOffline(false);

  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Ajustes" })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar copia" }).click();
  const backupPath = await (await downloadPromise).path();
  await page.locator('input[type="file"]').setInputFiles(backupPath);
  await expect(page.getByText("Javier").last()).toBeVisible();
  await page
    .getByRole("button", { name: "Reemplazar todos los datos" })
    .click();
  await page.getByRole("button", { name: "Reemplazar datos" }).click();
  await expect(
    page.getByRole("heading", { name: "Hola, Javier" }),
  ).toBeVisible();

  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Historial" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Historial", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Opciones del entreno/ }).click();
  await page.getByRole("button", { name: "Eliminar entreno" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar entreno" })
    .click();
  await expect(page.getByText("Historial vacío")).toBeVisible();
});
