import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { createBuiltInExercises } from "./exercise-catalog";
import {
  database,
  HormeDatabase,
  initializeDatabase,
  seedBuiltInExercises,
} from "./database";

describe("inicialización", () => {
  it("es idempotente y repone los integrados que falten", async () => {
    await initializeDatabase();
    const total = await database.exerciseDefinitions.count();
    await database.exerciseDefinitions.delete("built-in-001");
    await database.exerciseDefinitions.update("built-in-002", {
      isArchived: true,
    });

    await seedBuiltInExercises();

    expect(await database.exerciseDefinitions.count()).toBe(total);
    expect(
      await database.exerciseDefinitions.get("built-in-001"),
    ).toBeDefined();
    expect(
      (await database.exerciseDefinitions.get("built-in-002"))?.isArchived,
    ).toBe(true);
  });
});

describe("migraciones", () => {
  it("v4 recategoriza el thruster integrado de una base v3", async () => {
    const name = `migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(3).stores({
      athleteProfiles: "athleteProfileId, updatedAt",
      bodyMeasurements: "bodyMeasurementId, measurementDate, updatedAt",
      exerciseDefinitions: "exerciseDefinitionId, name, category, origin",
      trainingSessions: "trainingSessionId, sessionDate, status, updatedAt",
      trainingBlocks:
        "trainingBlockId, trainingSessionId, type, [trainingSessionId+position]",
      exerciseMovements:
        "exerciseMovementId, trainingBlockId, exerciseDefinitionId, [trainingBlockId+position]",
      setRecords:
        "setRecordId, exerciseMovementId, [exerciseMovementId+position]",
      applicationMetadata: "key",
    });
    const exercises = createBuiltInExercises("2026-01-01T00:00:00.000Z").map(
      (exercise) =>
        exercise.exerciseDefinitionId === "built-in-044"
          ? { ...exercise, category: "material-funcional" as const }
          : exercise,
    );
    await legacy.table("exerciseDefinitions").bulkAdd(exercises);
    legacy.close();

    const upgraded = new HormeDatabase(name);
    await upgraded.open();
    expect(upgraded.verno).toBeGreaterThanOrEqual(4);
    expect(
      (await upgraded.exerciseDefinitions.get("built-in-044"))?.category,
    ).toBe("fuerza-halterofilia");
    expect(await upgraded.exerciseDefinitions.count()).toBe(exercises.length);
    upgraded.close();
    await Dexie.delete(name);
  });
});
