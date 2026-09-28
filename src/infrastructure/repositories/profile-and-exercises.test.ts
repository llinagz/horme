import { beforeEach, describe, expect, it } from "vitest";
import { completeOnboarding } from "@/application/complete-onboarding";
import { clearDatabase } from "@/test/database-helpers";
import { athleteProfileRepository } from "./athlete-profile-repository";
import { exerciseDefinitionRepository } from "./exercise-definition-repository";

beforeEach(clearDatabase);

describe("perfil", () => {
  it("cambia el nombre recortado y valida la longitud", async () => {
    await expect(
      athleteProfileRepository.updateDisplayName("Ana"),
    ).rejects.toThrow("Completa primero el perfil");

    await completeOnboarding({
      displayName: "Javier",
      measurementDate: "2026-08-08",
      heightCentimeters: 181,
      weightKilograms: 78,
    });
    await athleteProfileRepository.updateDisplayName("  Javi  ");
    expect((await athleteProfileRepository.get())?.displayName).toBe("Javi");

    await expect(
      athleteProfileRepository.updateDisplayName("x".repeat(51)),
    ).rejects.toThrow();
  });
});

describe("ejercicios personalizados", () => {
  it("crea, lista, archiva y desarchiva", async () => {
    const id = await exerciseDefinitionRepository.createCustom({
      name: "  Zancada con salto ",
      englishAlias: " Jumping lunge ",
      category: "peso-corporal",
      metrics: ["repetitions", "repetitions"],
    });

    const created = (await exerciseDefinitionRepository.list()).find(
      (definition) => definition.exerciseDefinitionId === id,
    );
    expect(created).toMatchObject({
      name: "Zancada con salto",
      englishAlias: "Jumping lunge",
      metrics: ["repetitions"],
      origin: "custom",
    });

    await exerciseDefinitionRepository.setArchived(id, true);
    expect(
      (await exerciseDefinitionRepository.list()).some(
        (definition) => definition.exerciseDefinitionId === id,
      ),
    ).toBe(false);
    expect(
      (await exerciseDefinitionRepository.list({ includeArchived: true })).some(
        (definition) => definition.exerciseDefinitionId === id,
      ),
    ).toBe(true);
  });

  it("exige nombre y métricas y no archiva integrados", async () => {
    await expect(
      exerciseDefinitionRepository.createCustom({
        name: "  ",
        englishAlias: "",
        category: "gimnasia",
        metrics: ["repetitions"],
      }),
    ).rejects.toThrow("El ejercicio necesita un nombre");
    await expect(
      exerciseDefinitionRepository.createCustom({
        name: "Algo",
        englishAlias: "",
        category: "gimnasia",
        metrics: [],
      }),
    ).rejects.toThrow("Selecciona al menos una métrica");
    await expect(
      exerciseDefinitionRepository.setArchived("built-in-001", true),
    ).rejects.toThrow("Solo se pueden archivar ejercicios personalizados");
  });

  it("ordena alfabéticamente en español", async () => {
    const names = (await exerciseDefinitionRepository.list()).map(
      (definition) => definition.name,
    );
    expect(names).toEqual(names.toSorted((a, b) => a.localeCompare(b, "es")));
  });
});
