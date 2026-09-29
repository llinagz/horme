import { describe, expect, it } from "vitest";
import {
  applyCatalogMetadata,
  createBuiltInExercises,
} from "./exercise-catalog";

const timestamp = "2026-08-08T10:00:00.000Z";

describe("catálogo incorporado", () => {
  it("contiene 65 movimientos con identificadores estables", () => {
    const exercises = createBuiltInExercises(timestamp);
    expect(exercises).toHaveLength(65);
    expect(
      new Set(exercises.map((exercise) => exercise.exerciseDefinitionId)).size,
    ).toBe(65);
    expect(exercises).toContainEqual(
      expect.objectContaining({
        exerciseDefinitionId: "built-in-044",
        name: "Thruster",
        category: "fuerza-halterofilia",
      }),
    );
    expect(exercises.every((exercise) => exercise.metrics.length > 0)).toBe(
      true,
    );
  });

  it("no repite nombres ni alias", () => {
    const exercises = createBuiltInExercises(timestamp);
    expect(new Set(exercises.map((exercise) => exercise.name)).size).toBe(
      exercises.length,
    );
    expect(
      new Set(exercises.map((exercise) => exercise.englishAlias)).size,
    ).toBe(exercises.length);
  });

  it("no cambia el identificador de ningún ejercicio existente", () => {
    // Los IDs se derivan de la posición en el catálogo y ya están guardados
    // en los dispositivos: los ejercicios nuevos se añaden siempre al final.
    const identifiers = Object.fromEntries(
      createBuiltInExercises(timestamp).map((exercise) => [
        exercise.exerciseDefinitionId,
        exercise.englishAlias,
      ]),
    );
    expect(identifiers).toMatchSnapshot();
  });

  it("clasifica todos los ejercicios por grupo muscular y material", () => {
    for (const exercise of createBuiltInExercises(timestamp)) {
      expect(exercise.secondaryMuscleGroups).not.toContain(
        exercise.muscleGroup,
      );
      expect(new Set(exercise.secondaryMuscleGroups).size).toBe(
        exercise.secondaryMuscleGroups.length,
      );
    }
  });

  it("incluye los ejercicios de fuerza por libre con su clasificación", () => {
    const byId = new Map(
      createBuiltInExercises(timestamp).map((exercise) => [
        exercise.exerciseDefinitionId,
        exercise,
      ]),
    );
    expect(byId.get("built-in-003")).toMatchObject({
      name: "Peso muerto convencional",
      muscleGroup: "espalda",
      secondaryMuscleGroups: ["isquios", "gluteos"],
      equipment: "barra",
    });
    expect(byId.get("built-in-051")).toMatchObject({
      name: "Press de hombro sentado con mancuernas",
      muscleGroup: "hombro",
      equipment: "mancuerna",
    });
    expect(byId.get("built-in-062")).toMatchObject({
      name: "Zancadas caminando con mancuernas",
      muscleGroup: "cuadriceps",
      equipment: "mancuerna",
    });
    expect(byId.get("built-in-065")).toMatchObject({
      name: "Curl de bíceps con mancuerna",
      muscleGroup: "biceps",
    });
  });
});

describe("applyCatalogMetadata", () => {
  const legacyBuiltIn = {
    exerciseDefinitionId: "built-in-003",
    name: "Peso muerto",
    englishAlias: "Deadlift",
    category: "fuerza-halterofilia" as const,
    metrics: ["repetitions" as const],
    origin: "built-in" as const,
    isArchived: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  it("completa y renombra los ejercicios integrados desde el catálogo", () => {
    expect(applyCatalogMetadata(legacyBuiltIn)).toMatchObject({
      name: "Peso muerto convencional",
      englishAlias: "Conventional Deadlift",
      muscleGroup: "espalda",
      equipment: "barra",
      isArchived: true,
    });
  });

  it("deduce la clasificación de un ejercicio propio a partir de su categoría", () => {
    const custom = {
      ...legacyBuiltIn,
      exerciseDefinitionId: "custom-1",
      origin: "custom" as const,
      category: "monoestructural" as const,
    };
    expect(applyCatalogMetadata(custom)).toMatchObject({
      name: "Peso muerto",
      muscleGroup: "core-acondicionamiento",
      secondaryMuscleGroups: [],
      equipment: "ergometro",
    });
  });

  it("respeta la clasificación que ya tiene un ejercicio propio", () => {
    const classified = {
      ...legacyBuiltIn,
      exerciseDefinitionId: "custom-1",
      origin: "custom" as const,
      muscleGroup: "biceps" as const,
      secondaryMuscleGroups: [],
      equipment: "mancuerna" as const,
    };
    expect(applyCatalogMetadata(classified)).toMatchObject({
      muscleGroup: "biceps",
      equipment: "mancuerna",
    });
  });
});
