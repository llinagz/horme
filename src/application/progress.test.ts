import { beforeEach, describe, expect, it } from "vitest";
import { database } from "@/infrastructure/database";
import { knownLiftRepository } from "@/infrastructure/repositories/known-lift-repository";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import {
  addTestExercise,
  clearDatabase,
  createStrengthSession,
  getSortedSets,
} from "@/test/database-helpers";
import {
  describeSet,
  getExerciseProgressPoints,
  listExerciseProgress,
} from "./progress";

beforeEach(async () => {
  await clearDatabase();
  await addTestExercise();
});

async function completeAllSets(movementId: string): Promise<void> {
  for (const setRecord of await getSortedSets(movementId))
    await trainingSessionRepository.updateSet(setRecord.setRecordId, {
      isCompleted: true,
    });
}

describe("progreso con marcas registradas", () => {
  it("muestra un ejercicio que solo tiene marcas, sin volumen ni series", async () => {
    await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 100,
      repetitions: 5,
    });

    const [item] = await listExerciseProgress();
    expect(item).toMatchObject({
      maximumActualWeightKilograms: 100,
      totalVolumeKilograms: 0,
      completedSetCount: 0,
      knownLiftCount: 1,
      latestSessionDate: "",
    });
    expect(item?.estimatedOneRepMaxKilograms).toBeCloseTo(116.67, 2);
  });

  it("combina marcas y sesiones y toma la fecha más reciente", async () => {
    const session = await createStrengthSession({
      sessionDate: "2026-08-01",
      setCount: 1,
      repetitions: 5,
      weightKilograms: 90,
    });
    await completeAllSets(session.movementId);
    await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 140,
      repetitions: 1,
      recordDate: "2026-09-01",
    });

    const [item] = await listExerciseProgress();
    expect(item).toMatchObject({
      maximumActualWeightKilograms: 140,
      estimatedOneRepMaxKilograms: 140,
      totalVolumeKilograms: 450,
      completedSetCount: 1,
      latestSessionDate: "2026-09-01",
    });
  });

  it("solo las marcas con fecha entran en la gráfica y no suman volumen", async () => {
    await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 100,
      repetitions: 5,
      recordDate: "2026-07-01",
    });
    await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 120,
      repetitions: 1,
    });

    const points = getExerciseProgressPoints(
      [],
      await knownLiftRepository.listByExercise("test-deadlift"),
    );
    expect(points).toMatchObject([
      { date: "2026-07-01", volumeKilograms: 0, maximumWeightKilograms: 100 },
    ]);
  });

  it("une en un punto la sesión y la marca del mismo día", async () => {
    const session = await createStrengthSession({
      sessionDate: "2026-08-01",
      setCount: 1,
      repetitions: 5,
      weightKilograms: 90,
    });
    await completeAllSets(session.movementId);
    await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 100,
      repetitions: 3,
      recordDate: "2026-08-01",
    });

    const points = getExerciseProgressPoints(
      await trainingSessionRepository.listExerciseHistory("test-deadlift"),
      await knownLiftRepository.listByExercise("test-deadlift"),
    );
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      volumeKilograms: 450,
      maximumWeightKilograms: 100,
    });
  });
});

describe("progreso por ejercicio", () => {
  it("resume cada ejercicio y ordena por la sesión más reciente", async () => {
    await addTestExercise({
      exerciseDefinitionId: "test-squat",
      name: "Sentadilla",
    });
    const deadlift = await createStrengthSession({
      sessionDate: "2026-08-01",
      setCount: 2,
      repetitions: 5,
      weightKilograms: 100,
    });
    await completeAllSets(deadlift.movementId);
    const squat = await createStrengthSession({
      sessionDate: "2026-08-04",
      exerciseDefinitionId: "test-squat",
      setCount: 1,
      repetitions: 1,
      weightKilograms: 140,
    });
    await completeAllSets(squat.movementId);

    const progress = await listExerciseProgress();
    expect(progress.map((item) => item.exercise.name)).toEqual([
      "Sentadilla",
      "Peso muerto",
    ]);
    expect(progress[1]).toMatchObject({
      maximumActualWeightKilograms: 100,
      totalVolumeKilograms: 1000,
      completedSetCount: 2,
      latestSessionDate: "2026-08-01",
    });
    expect(progress[0]?.estimatedOneRepMaxKilograms).toBe(140);
  });

  it("genera un punto por sesión en orden cronológico", async () => {
    const later = await createStrengthSession({
      sessionDate: "2026-08-10",
      setCount: 1,
      repetitions: 3,
      weightKilograms: 120,
    });
    await completeAllSets(later.movementId);
    const earlier = await createStrengthSession({
      sessionDate: "2026-08-02",
      setCount: 1,
      repetitions: 5,
      weightKilograms: 100,
    });
    await completeAllSets(earlier.movementId);

    const points = getExerciseProgressPoints(
      await trainingSessionRepository.listExerciseHistory("test-deadlift"),
    );
    expect(points.map((point) => point.date)).toEqual([
      "2026-08-02",
      "2026-08-10",
    ]);
    expect(points[1]).toMatchObject({
      volumeKilograms: 360,
      maximumWeightKilograms: 120,
    });
    expect(points[1]?.estimatedOneRepMaxKilograms).toBeCloseTo(132);
  });

  it("describe una serie con sus métricas", () => {
    const base = {
      setRecordId: "s",
      exerciseMovementId: "m",
      position: 0,
      isCompleted: true,
      createdAt: "",
      updatedAt: "",
    };
    expect(describeSet({ ...base, repetitions: 5, weightKilograms: 80 })).toBe(
      "5 rep · 80 kg",
    );
    expect(describeSet({ ...base, calories: 12, durationSeconds: 60 })).toBe(
      "60 s · 12 cal",
    );
    expect(describeSet(base)).toBe("Sin datos");
  });

  it("calcula el progreso de un año de entrenos en poco tiempo", async () => {
    const timestamp = new Date().toISOString();
    const exerciseIds = ["test-deadlift", "a", "b", "c", "d"];
    for (const id of exerciseIds.slice(1))
      await addTestExercise({
        exerciseDefinitionId: id,
        name: `Ejercicio ${id}`,
      });
    await database.transaction("rw", database.tables, async () => {
      for (let day = 0; day < 200; day += 1) {
        const trainingSessionId = crypto.randomUUID();
        const trainingBlockId = crypto.randomUUID();
        await database.trainingSessions.add({
          trainingSessionId,
          sessionDate: `2026-${String((day % 12) + 1).padStart(2, "0")}-${String((day % 28) + 1).padStart(2, "0")}`,
          status: "completed",
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        await database.trainingBlocks.add({
          trainingBlockId,
          trainingSessionId,
          type: "strength",
          title: "Fuerza",
          position: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        for (const [position, exerciseDefinitionId] of exerciseIds.entries()) {
          const exerciseMovementId = crypto.randomUUID();
          await database.exerciseMovements.add({
            exerciseMovementId,
            trainingBlockId,
            exerciseDefinitionId,
            position,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
          await database.setRecords.bulkAdd(
            [0, 1, 2].map((setPosition) => ({
              setRecordId: crypto.randomUUID(),
              exerciseMovementId,
              position: setPosition,
              repetitions: 5,
              weightKilograms: 60 + day / 10,
              isCompleted: true,
              createdAt: timestamp,
              updatedAt: timestamp,
            })),
          );
        }
      }
    });

    const start = performance.now();
    const progress = await listExerciseProgress();
    const elapsed = performance.now() - start;

    expect(progress).toHaveLength(5);
    expect(progress.every((item) => item.completedSetCount === 600)).toBe(true);
    expect(elapsed).toBeLessThan(1000);
  });
});
