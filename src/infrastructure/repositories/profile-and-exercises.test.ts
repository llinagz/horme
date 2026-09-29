import { beforeEach, describe, expect, it } from "vitest";
import { completeOnboarding } from "@/application/complete-onboarding";
import type { Equipment } from "@/domain/entities";
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
      muscleGroup: "cuadriceps",
      secondaryMuscleGroups: ["gluteos"],
      equipment: "peso-corporal",
      metrics: ["repetitions", "repetitions"],
    });

    const created = (await exerciseDefinitionRepository.list()).find(
      (definition) => definition.exerciseDefinitionId === id,
    );
    expect(created).toMatchObject({
      name: "Zancada con salto",
      englishAlias: "Jumping lunge",
      muscleGroup: "cuadriceps",
      secondaryMuscleGroups: ["gluteos"],
      equipment: "peso-corporal",
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
        muscleGroup: "espalda",
        equipment: "peso-corporal",
        metrics: ["repetitions"],
      }),
    ).rejects.toThrow("El ejercicio necesita un nombre");
    await expect(
      exerciseDefinitionRepository.createCustom({
        name: "Algo",
        englishAlias: "",
        muscleGroup: "espalda",
        equipment: "peso-corporal",
        metrics: [],
      }),
    ).rejects.toThrow("Selecciona al menos una métrica");
    await expect(
      exerciseDefinitionRepository.setArchived("built-in-001", true),
    ).rejects.toThrow("Solo se pueden archivar ejercicios personalizados");
  });

  it("deduce la categoría heredada del material", async () => {
    const created = async (equipment: Equipment) => {
      const id = await exerciseDefinitionRepository.createCustom({
        name: `Prueba ${equipment}`,
        englishAlias: "",
        muscleGroup: "gluteos",
        equipment,
        metrics: ["repetitions"],
      });
      return (await exerciseDefinitionRepository.get(id))?.category;
    };
    expect(await created("barra")).toBe("fuerza-halterofilia");
    expect(await created("peso-corporal")).toBe("peso-corporal");
    expect(await created("ergometro")).toBe("monoestructural");
    expect(await created("kettlebell")).toBe("material-funcional");
  });

  it("clasifica un ejercicio nuevo por su grupo muscular principal", async () => {
    const id = await exerciseDefinitionRepository.createCustom({
      name: "Hip thrust con barra",
      englishAlias: "Barbell Hip Thrust",
      muscleGroup: "gluteos",
      secondaryMuscleGroups: ["isquios"],
      equipment: "barra",
      metrics: ["repetitions", "weightKilograms"],
    });
    expect(await exerciseDefinitionRepository.get(id)).toMatchObject({
      muscleGroup: "gluteos",
      secondaryMuscleGroups: ["isquios"],
    });
  });

  it("rechaza secundarios repetidos o que incluyan el principal", async () => {
    const input = {
      name: "Algo",
      englishAlias: "",
      muscleGroup: "gluteos" as const,
      equipment: "barra" as const,
      metrics: ["repetitions" as const],
    };
    await expect(
      exerciseDefinitionRepository.createCustom({
        ...input,
        secondaryMuscleGroups: ["gluteos"],
      }),
    ).rejects.toThrow("no pueden repetirse ni incluir el principal");
    await expect(
      exerciseDefinitionRepository.createCustom({
        ...input,
        secondaryMuscleGroups: ["isquios", "isquios"],
      }),
    ).rejects.toThrow("no pueden repetirse ni incluir el principal");
  });

  it("edita un ejercicio personalizado y rechaza uno integrado", async () => {
    const id = await exerciseDefinitionRepository.createCustom({
      name: "Curl martillo",
      englishAlias: "",
      muscleGroup: "espalda",
      equipment: "otro",
      metrics: ["repetitions", "weightKilograms"],
    });

    await exerciseDefinitionRepository.updateCustom(id, {
      name: "Curl martillo",
      englishAlias: "Hammer Curl",
      muscleGroup: "biceps",
      secondaryMuscleGroups: [],
      equipment: "mancuerna",
    });

    expect(await exerciseDefinitionRepository.get(id)).toMatchObject({
      englishAlias: "Hammer Curl",
      muscleGroup: "biceps",
      equipment: "mancuerna",
      category: "material-funcional",
      metrics: ["repetitions", "weightKilograms"],
    });
    await expect(
      exerciseDefinitionRepository.updateCustom("built-in-001", {
        name: "Otro nombre",
        englishAlias: "",
        muscleGroup: "biceps",
        secondaryMuscleGroups: [],
        equipment: "barra",
      }),
    ).rejects.toThrow("Solo se pueden editar ejercicios personalizados");
  });

  it("ordena alfabéticamente en español", async () => {
    const names = (await exerciseDefinitionRepository.list()).map(
      (definition) => definition.name,
    );
    expect(names).toEqual(names.toSorted((a, b) => a.localeCompare(b, "es")));
  });
});
