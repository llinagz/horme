import Dexie, { type EntityTable } from "dexie";
import type {
  ApplicationMetadata,
  AthleteProfile,
  BodyMeasurement,
  ExerciseDefinition,
  ExerciseMovement,
  SetRecord,
  TrainingBlock,
  TrainingSession,
} from "@/domain/entities";
import { createBuiltInExercises } from "./exercise-catalog";

export class HormeDatabase extends Dexie {
  athleteProfiles!: EntityTable<AthleteProfile, "athleteProfileId">;
  bodyMeasurements!: EntityTable<BodyMeasurement, "bodyMeasurementId">;
  exerciseDefinitions!: EntityTable<ExerciseDefinition, "exerciseDefinitionId">;
  trainingSessions!: EntityTable<TrainingSession, "trainingSessionId">;
  trainingBlocks!: EntityTable<TrainingBlock, "trainingBlockId">;
  exerciseMovements!: EntityTable<ExerciseMovement, "exerciseMovementId">;
  setRecords!: EntityTable<SetRecord, "setRecordId">;
  applicationMetadata!: EntityTable<ApplicationMetadata, "key">;

  constructor(databaseName = "HormeDatabase") {
    super(databaseName);
    this.version(1).stores({
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
    this.version(2).stores({
      exerciseDefinitions: "exerciseDefinitionId, name, category, origin",
    });
    this.version(3).stores({
      trainingBlocks:
        "trainingBlockId, trainingSessionId, type, [trainingSessionId+position]",
    });
    this.version(4)
      .stores({
        exerciseDefinitions: "exerciseDefinitionId, name, category, origin",
      })
      .upgrade(async (transaction) => {
        const thruster = await transaction
          .table<ExerciseDefinition, string>("exerciseDefinitions")
          .get("built-in-044");
        if (thruster?.origin === "built-in") {
          await transaction
            .table("exerciseDefinitions")
            .update("built-in-044", {
              category: "fuerza-halterofilia",
              updatedAt: new Date().toISOString(),
            });
        }
      });
  }
}

export const database = new HormeDatabase();

let initializationPromise: Promise<void> | undefined;

/** Añade los ejercicios integrados que falten sin tocar los existentes. */
export async function seedBuiltInExercises(): Promise<void> {
  const builtIns = createBuiltInExercises(new Date().toISOString());
  await database.transaction("rw", database.exerciseDefinitions, async () => {
    const existing = await database.exerciseDefinitions.bulkGet(
      builtIns.map((exercise) => exercise.exerciseDefinitionId),
    );
    const missing = builtIns.filter((_, index) => !existing[index]);
    if (missing.length > 0) await database.exerciseDefinitions.bulkAdd(missing);
  });
}

/**
 * Abre la base una sola vez y siembra el catálogo. Si falla, el siguiente
 * intento vuelve a probar en lugar de reutilizar el error.
 */
export function initializeDatabase(): Promise<void> {
  initializationPromise ??= (async () => {
    await database.open();
    await seedBuiltInExercises();
  })().catch((error: unknown) => {
    initializationPromise = undefined;
    throw error;
  });
  return initializationPromise;
}
