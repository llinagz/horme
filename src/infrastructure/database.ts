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
  }
}

export const database = new HormeDatabase();

let initializationPromise: Promise<void> | undefined;

export function initializeDatabase(): Promise<void> {
  initializationPromise ??= (async () => {
    await database.open();
    if (
      (await database.exerciseDefinitions
        .where("origin")
        .equals("built-in")
        .count()) === 0
    ) {
      await database.exerciseDefinitions.bulkAdd(
        createBuiltInExercises(new Date().toISOString()),
      );
    }
  })();
  return initializationPromise;
}
