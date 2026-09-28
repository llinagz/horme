import { expect, type Page } from "@playwright/test";

export async function completeOnboarding(
  page: Page,
  name = "Javier",
): Promise<void> {
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding\/?$/);
  await page.getByPlaceholder("Tu nombre").fill(name);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder("175").fill("181");
  await page.getByPlaceholder("75,5").fill("78,4");
  await page.getByRole("button", { name: "Entrar en Hormé" }).click();
  await expect(
    page.getByRole("heading", { name: `Hola, ${name}` }),
  ).toBeVisible();
}

/** Desde Inicio: sesión nueva con un bloque de fuerza y el ejercicio elegido. */
export async function startStrengthSession(
  page: Page,
  search: string,
  exerciseName: RegExp,
): Promise<void> {
  await page.getByRole("button", { name: "Empezar sesión" }).click();
  await page.getByRole("button", { name: "Fuerza", exact: true }).click();
  await page.getByRole("searchbox").fill(search);
  await page.getByRole("button", { name: exerciseName }).click();
  await expect(page.getByRole("heading", { name: exerciseName })).toBeVisible();
}

export async function waitForServiceWorkerControl(page: Page): Promise<void> {
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
