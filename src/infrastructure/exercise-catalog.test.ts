import { describe, expect, it } from "vitest";
import { createBuiltInExercises } from "./exercise-catalog";

describe("catálogo incorporado", () => {
  it("contiene 50 movimientos esenciales con identificadores estables", () => {
    const exercises = createBuiltInExercises("2026-08-08T10:00:00.000Z");
    expect(exercises).toHaveLength(50);
    expect(
      new Set(exercises.map((exercise) => exercise.exerciseDefinitionId)).size,
    ).toBe(50);
    expect(exercises.some((exercise) => exercise.name === "Peso muerto")).toBe(
      true,
    );
    expect(exercises.every((exercise) => exercise.metrics.length > 0)).toBe(
      true,
    );
  });
});
