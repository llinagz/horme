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

  it("v5 clasifica los ejercicios de una base v4 y conserva su historial", async () => {
    const name = `migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(4).stores({
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
    const timestamp = "2026-01-01T00:00:00.000Z";
    const oldShape = {
      exerciseDefinitionId: "built-in-003",
      name: "Peso muerto",
      englishAlias: "Deadlift",
      category: "fuerza-halterofilia",
      metrics: ["repetitions", "weightKilograms"],
      origin: "built-in",
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await legacy.table("exerciseDefinitions").bulkAdd([
      oldShape,
      {
        ...oldShape,
        exerciseDefinitionId: "custom-1",
        name: "Remo en TRX",
        englishAlias: "",
        category: "material-funcional",
        origin: "custom",
      },
    ]);
    legacy.close();

    const upgraded = new HormeDatabase(name);
    await upgraded.open();
    expect(upgraded.verno).toBeGreaterThanOrEqual(5);
    expect(
      await upgraded.exerciseDefinitions.get("built-in-003"),
    ).toMatchObject({
      name: "Peso muerto convencional",
      muscleGroup: "espalda",
      secondaryMuscleGroups: ["isquios", "gluteos"],
      equipment: "barra",
    });
    expect(await upgraded.exerciseDefinitions.get("custom-1")).toMatchObject({
      name: "Remo en TRX",
      muscleGroup: "cuerpo-completo",
      secondaryMuscleGroups: [],
      equipment: "otro",
    });
    upgraded.close();
    await Dexie.delete(name);
  });

  it("v6 añade las marcas registradas y conserva los datos de una base v5", async () => {
    const name = `migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(5).stores({
      athleteProfiles: "athleteProfileId, updatedAt",
      bodyMeasurements: "bodyMeasurementId, measurementDate, updatedAt",
      exerciseDefinitions:
        "exerciseDefinitionId, name, category, origin, muscleGroup, equipment",
      trainingSessions: "trainingSessionId, sessionDate, status, updatedAt",
      trainingBlocks:
        "trainingBlockId, trainingSessionId, type, [trainingSessionId+position]",
      exerciseMovements:
        "exerciseMovementId, trainingBlockId, exerciseDefinitionId, [trainingBlockId+position]",
      setRecords:
        "setRecordId, exerciseMovementId, [exerciseMovementId+position]",
      applicationMetadata: "key",
    });
    await legacy.table("trainingSessions").add({
      trainingSessionId: "session-1",
      sessionDate: "2026-08-01",
      status: "completed",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
    });
    legacy.close();

    const upgraded = new HormeDatabase(name);
    await upgraded.open();
    expect(upgraded.verno).toBeGreaterThanOrEqual(6);
    expect(await upgraded.trainingSessions.count()).toBe(1);
    expect(await upgraded.knownLifts.count()).toBe(0);
    await upgraded.knownLifts.add({
      knownLiftId: "lift-1",
      exerciseDefinitionId: "built-in-003",
      weightKilograms: 100,
      repetitions: 5,
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
    });
    expect(
      await upgraded.knownLifts
        .where("exerciseDefinitionId")
        .equals("built-in-003")
        .count(),
    ).toBe(1);
    upgraded.close();
    await Dexie.delete(name);
  });
});
