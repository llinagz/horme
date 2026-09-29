import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

test("crea un ejercicio desde el buscador, ya clasificado, y lo encuentra por grupo", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: "Empezar sesión" }).click();
  await page.getByRole("button", { name: "Fuerza", exact: true }).click();

  // El catálogo se organiza por grupo muscular.
  await expect(page.getByRole("heading", { name: "Hombro" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Curl de bíceps con mancuerna/ }),
  ).toBeVisible();

  // Un ejercicio que no existe se crea ahí mismo.
  await page.getByRole("searchbox").fill("Hip thrust con barra");
  await page
    .getByRole("button", { name: "Crear «Hip thrust con barra»" })
    .click();
  await page
    .getByRole("combobox", { name: /^Grupo muscular principal/ })
    .selectOption("gluteos");
  await page.getByRole("combobox", { name: /^Material/ }).selectOption("barra");
  await page
    .getByRole("group", { name: "Grupos musculares secundarios" })
    .getByRole("button", { name: "Isquios" })
    .click();
  await page.getByRole("button", { name: "Crear y añadir" }).click();
  await expect(
    page.getByRole("heading", { name: "Hip thrust con barra" }),
  ).toBeVisible();

  // Queda en su sección y se encuentra también por su grupo secundario.
  await page.getByRole("button", { name: "Ejercicio", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Glúteos" })).toBeVisible();
  await page.getByRole("searchbox").fill("isquios");
  await expect(
    page.getByRole("button", { name: /^Hip thrust con barra/ }),
  ).toBeVisible();
});
