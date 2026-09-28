import type { ExerciseDefinition } from "@/domain/entities";
import { database, initializeDatabase } from "@/infrastructure/database";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";

export async function clearDatabase(): Promise<void> {
  await initializeDatabase();
  await database.transaction("rw", database.tables, async () => {
    await Promise.all(database.tables.map((table) => table.clear()));
  });
}

export async function addTestExercise(
  overrides: Partial<ExerciseDefinition> = {},
): Promise<ExerciseDefinition> {
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
    ...overrides,
  };
  await database.exerciseDefinitions.add(exercise);
  return exercise;
}

/** Crea una sesión con un bloque de fuerza, un ejercicio y `setCount` series. */
export async function createStrengthSession(
  options: {
    sessionDate?: string;
    exerciseDefinitionId?: string;
    setCount?: number;
    repetitions?: number;
    weightKilograms?: number;
  } = {},
): Promise<{ sessionId: string; blockId: string; movementId: string }> {
  const sessionId = await trainingSessionRepository.create(
    options.sessionDate ?? "2026-08-08",
  );
  const blockId = await trainingSessionRepository.addBlock(
    sessionId,
    "strength",
  );
  const movementId = await trainingSessionRepository.addMovement(
    blockId,
    options.exerciseDefinitionId ?? "test-deadlift",
  );
  if ((options.setCount ?? 0) > 0) {
    await trainingSessionRepository.addRepeatedSets(
      movementId,
      options.setCount ?? 0,
      {
        ...(options.repetitions !== undefined
          ? { repetitions: options.repetitions }
          : {}),
        ...(options.weightKilograms !== undefined
          ? { weightKilograms: options.weightKilograms }
          : {}),
      },
    );
  }
  return { sessionId, blockId, movementId };
}

export async function getSortedSets(movementId: string) {
  return database.setRecords
    .where("exerciseMovementId")
    .equals(movementId)
    .sortBy("position");
}
