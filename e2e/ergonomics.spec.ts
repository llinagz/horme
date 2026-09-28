import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, startStrengthSession } from "./helpers";

async function seedSession(page: Page): Promise<void> {
  await completeOnboarding(page);
  await startStrengthSession(page, "trasera", /Sentadilla trasera/);
}

/** Controles visibles cuyo tamaño táctil es menor que el mínimo. */
async function findSmallTargets(page: Page, minimum = 44) {
  return page.evaluate((size) => {
    const selector =
      "button, a[href], input:not([type=hidden]), select, textarea, [role=radio]";
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (box.width === 0 || style.visibility === "hidden") return false;
        if (element.closest("dialog:not([open])")) return false;
        // Casillas dentro de su etiqueta: cuenta la etiqueta entera.
        const target =
          element instanceof HTMLInputElement &&
          element.type === "checkbox" &&
          element.closest("label")
            ? element.closest("label")!.getBoundingClientRect()
            : box;
        return target.height < size - 0.5 || target.width < size - 0.5;
      })
      .map(
        (element) =>
          `${element.tagName.toLowerCase()} «${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40)}»`,
      );
  }, minimum);
}

test.describe("en el gimnasio", () => {
  test("las cifras largas nunca pisan los botones − y +", async ({ page }) => {
    await seedSession(page);
    const weight = page.getByLabel("Carga", { exact: true });
    for (const value of ["117,5", "1002,5"]) {
      await weight.fill(value);
      await weight.blur();
      const overlaps = await page.evaluate(() =>
        [...document.querySelectorAll("input[inputmode]")].flatMap((input) => {
          const row = input.closest("div")?.parentElement;
          const buttons = row?.querySelectorAll(":scope > button");
          if (!row || buttons?.length !== 2) return [];
          const [minus, plus] = [...buttons].map((button) =>
            button.getBoundingClientRect(),
          );
          const value = input.parentElement!.getBoundingClientRect();
          const inputBox = input.getBoundingClientRect();
          const clipped =
            (input as HTMLInputElement).scrollWidth >
            (input as HTMLInputElement).clientWidth + 1;
          return value.left < minus!.right - 0.5 ||
            value.right > plus!.left + 0.5 ||
            inputBox.right > plus!.left + 0.5 ||
            clipped
            ? [(input as HTMLInputElement).value]
            : [];
        }),
      );
      expect(overlaps, `con ${value} kg`).toEqual([]);
    }
  });

  test("todos los controles miden al menos 44 px", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "Solo en móvil");
    await seedSession(page);
    const problems: string[] = [];
    problems.push(
      ...(await findSmallTargets(page)).map((item) => `sesión: ${item}`),
    );
    for (const path of [
      "/",
      "/history/",
      "/progress/",
      "/profile/",
      "/settings/",
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      problems.push(
        ...(await findSmallTargets(page)).map((item) => `${path}: ${item}`),
      );
    }
    expect(problems).toEqual([]);
  });

  test("dos toques seguidos no duplican bloques", async ({ page }) => {
    await completeOnboarding(page);
    await page.getByRole("button", { name: "Empezar sesión" }).click();
    const wod = page.getByRole("button", { name: "WOD", exact: true });
    await wod.dblclick();
    await expect(page.getByRole("region", { name: "WOD" })).toHaveCount(1);
  });
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`sin problemas graves de accesibilidad en ${colorScheme === "light" ? "claro" : "oscuro"}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await seedSession(page);
    const pages = [
      "/session/",
      "/",
      "/history/",
      "/progress/",
      "/profile/",
      "/settings/",
    ];
    const violations: string[] = [];
    for (const path of pages) {
      if (path !== "/session/") {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
      }
      const results = await new AxeBuilder({ page }).analyze();
      violations.push(
        ...results.violations
          .filter(
            (item) => item.impact === "serious" || item.impact === "critical",
          )
          .map(
            (item) =>
              `${path} ${item.id}: ${item.nodes
                .slice(0, 3)
                .map((node) => node.target.join(" "))
                .join(", ")}`,
          ),
      );
    }
    expect(violations).toEqual([]);
  });
}
