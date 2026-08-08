import { beforeEach, describe, expect, it } from "vitest";
import { completeOnboarding } from "@/application/complete-onboarding";
import { getTodayLocalDate } from "@/domain/dates";
import type { ExerciseDefinition } from "@/domain/entities";
import { createBackup, parseBackup, replaceDatabaseFromBackup } from "./backup";
import { database, initializeDatabase } from "./database";
import { bodyMeasurementRepository } from "./repositories/body-measurement-repository";
import { trainingSessionRepository } from "./repositories/training-session-repository";

async function clearDatabase(): Promise<void> {
  await initializeDatabase();
  await database.transaction("rw", database.tables, async () => {
    await Promise.all(database.tables.map((table) => table.clear()));
  });
}

async function addTestExercise(): Promise<ExerciseDefinition> {
  const timestamp = new Date().toISOString();
  const exercise: ExerciseDefinition = {
    exerciseDefinitionId: "test-deadlift",
    name: "Peso muerto",
    englishAlias: "Deadlift",
    category: "fuerza-halterofilia",
    metrics: ["repetitions", "weightKilograms"],
    origin: "built-in",
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await database.exerciseDefinitions.add(exercise);
  return exercise;
}

beforeEach(clearDatabase);

describe("persistencia transaccional", () => {
  it("crea juntos el perfil y la primera medición", async () => {
    await completeOnboarding({
      displayName: "Javier",
      measurementDate: "2026-08-08",
      heightCentimeters: 181,
      weightKilograms: 78,
    });
    expect(await database.athleteProfiles.count()).toBe(1);
    expect(await database.bodyMeasurements.count()).toBe(1);

    await expect(
      completeOnboarding({
        displayName: "",
        measurementDate: "2026-08-08",
        heightCentimeters: 50,
        weightKilograms: 10,
      }),
    ).rejects.toThrow();
    expect((await database.athleteProfiles.toArray())[0]?.displayName).toBe(
      "Javier",
    );
  });

  it("impide eliminar la altura inicial", async () => {
    await completeOnboarding({
      displayName: "Javier",
      measurementDate: "2026-08-08",
      heightCentimeters: 181,
      weightKilograms: 78,
    });
    const first = (await bodyMeasurementRepository.list())[0];
    expect(first).toBeDefined();
    await bodyMeasurementRepository.update(first?.bodyMeasurementId ?? "", {
      measurementDate: "2026-08-08",
      weightKilograms: 77,
    });
    expect((await bodyMeasurementRepository.list())[0]?.heightCentimeters).toBe(
      181,
    );
    await bodyMeasurementRepository.create({
      measurementDate: "2026-08-09",
      weightKilograms: 77,
    });
    await expect(
      bodyMeasurementRepository.remove(first?.bodyMeasurementId ?? ""),
    ).rejects.toThrow("última altura o el último peso");
    expect(await database.bodyMeasurements.count()).toBe(2);
  });

  it("duplica sesiones con UUID nuevos y limpia resultados", async () => {
    const exercise = await addTestExercise();
    const sourceSessionId =
      await trainingSessionRepository.create("2026-07-01");
    await trainingSessionRepository.update(sourceSessionId, {
      feelings: "Sesión intensa",
    });
    const blockId = await trainingSessionRepository.addBlock(
      sourceSessionId,
      "wod",
    );
    await trainingSessionRepository.updateBlock(blockId, {
      wodConfiguration: {
        name: "Test WOD",
        format: "for-time",
        scaling: "rx",
        result: "10:00",
        isCompleted: true,
        timeCapSeconds: 900,
      },
    });
    const movementId = await trainingSessionRepository.addMovement(
      blockId,
      exercise.exerciseDefinitionId,
    );
    await trainingSessionRepository.addRepeatedSets(movementId, 3, {
      repetitions: 1,
      weightKilograms: 115,
    });
    const source = await trainingSessionRepository.get(sourceSessionId);
    const firstSetId = source?.blocks[0]?.movements[0]?.sets[0]?.setRecordId;
    if (firstSetId) {
      await trainingSessionRepository.updateSet(firstSetId, {
        isCompleted: true,
      });
    }

    const duplicateId =
      await trainingSessionRepository.duplicateSession(sourceSessionId);
    const duplicate = await trainingSessionRepository.get(duplicateId);
    expect(duplicate?.session).toMatchObject({
      trainingSessionId: duplicateId,
      sessionDate: getTodayLocalDate(),
      status: "draft",
    });
    expect(duplicate?.session.feelings).toBeUndefined();
    expect(duplicate?.blocks[0]?.block.trainingBlockId).not.toBe(blockId);
    expect(
      duplicate?.blocks[0]?.block.wodConfiguration?.result,
    ).toBeUndefined();
    expect(
      duplicate?.blocks[0]?.movements[0]?.sets.every(
        (setRecord) => !setRecord.isCompleted,
      ),
    ).toBe(true);
  });

  it("elimina el bloque, sus ejercicios y reordena los restantes", async () => {
    const exercise = await addTestExercise();
    const sessionId = await trainingSessionRepository.create("2026-08-08");
    const firstBlockId = await trainingSessionRepository.addBlock(
      sessionId,
      "strength",
    );
    const movementId = await trainingSessionRepository.addMovement(
      firstBlockId,
      exercise.exerciseDefinitionId,
    );
    await trainingSessionRepository.addRepeatedSets(movementId, 1, {
      repetitions: 5,
    });
    const secondBlockId = await trainingSessionRepository.addBlock(
      sessionId,
      "technique",
    );

    await trainingSessionRepository.removeBlock(firstBlockId);

    expect(await database.trainingBlocks.count()).toBe(1);
    expect(await database.exerciseMovements.count()).toBe(0);
    expect(await database.setRecords.count()).toBe(0);
    expect(await database.trainingBlocks.get(secondBlockId)).toMatchObject({
      position: 0,
    });
  });

  it("elimina una serie y reordena las restantes", async () => {
    const exercise = await addTestExercise();
    const sessionId = await trainingSessionRepository.create("2026-08-08");
    const blockId = await trainingSessionRepository.addBlock(
      sessionId,
      "strength",
    );
    const movementId = await trainingSessionRepository.addMovement(
      blockId,
      exercise.exerciseDefinitionId,
    );
    await trainingSessionRepository.addRepeatedSets(movementId, 3, {
      repetitions: 5,
    });
    const sets = await database.setRecords
      .where("exerciseMovementId")
      .equals(movementId)
      .sortBy("position");

    await trainingSessionRepository.removeSet(sets[1]!.setRecordId);

    expect(
      await database.setRecords
        .where("exerciseMovementId")
        .equals(movementId)
        .sortBy("position"),
    ).toMatchObject([{ position: 0 }, { position: 1 }]);
  });
});

describe("copias", () => {
  it("restaura todas las colecciones en un dispositivo vacío", async () => {
    await completeOnboarding({
      displayName: "Javier",
      measurementDate: "2026-08-08",
      heightCentimeters: 181,
      weightKilograms: 78,
    });
    await addTestExercise();
    await trainingSessionRepository.create("2026-08-08");
    const backup = await createBackup();
    await clearDatabase();
    await replaceDatabaseFromBackup(backup);
    expect((await database.athleteProfiles.toArray())[0]?.displayName).toBe(
      "Javier",
    );
    expect(await database.trainingSessions.count()).toBe(1);
    expect(await database.exerciseDefinitions.count()).toBe(1);
  });

  it("rechaza referencias rotas antes de modificar la base", async () => {
    await completeOnboarding({
      displayName: "Perfil intacto",
      measurementDate: "2026-08-08",
      heightCentimeters: 181,
      weightKilograms: 78,
    });
    const backup = await createBackup();
    const invalidValue: unknown = {
      ...backup,
      collections: {
        ...backup.collections,
        setRecords: [
          {
            setRecordId: crypto.randomUUID(),
            exerciseMovementId: crypto.randomUUID(),
            position: 0,
            repetitions: 1,
            isCompleted: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    };
    expect(() => parseBackup(invalidValue)).toThrow("series sin un movimiento");
    await expect(replaceDatabaseFromBackup(invalidValue)).rejects.toThrow();
    expect((await database.athleteProfiles.toArray())[0]?.displayName).toBe(
      "Perfil intacto",
    );
  });
});
