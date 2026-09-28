import { z } from "zod";
import { getTodayLocalDate } from "@/domain/dates";
import type {
  AthleteProfile,
  BodyMeasurement,
  ExerciseDefinition,
  ExerciseMovement,
  SetRecord,
  TrainingBlock,
  TrainingSession,
} from "@/domain/entities";
import {
  athleteProfileSchema,
  bodyMeasurementSchema,
  exerciseDefinitionSchema,
  exerciseMovementSchema,
  setRecordSchema,
  trainingBlockSchema,
  trainingSessionSchema,
} from "@/domain/schemas";
import { database, initializeDatabase } from "./database";

export const backupSchema = z.strictObject({
  format: z.literal("horme-backup"),
  schemaVersion: z.literal(1),
  exportedAt: z.iso.datetime(),
  collections: z.strictObject({
    athleteProfiles: z.array(athleteProfileSchema).max(1),
    bodyMeasurements: z.array(bodyMeasurementSchema),
    exerciseDefinitions: z.array(exerciseDefinitionSchema),
    trainingSessions: z.array(trainingSessionSchema),
    trainingBlocks: z.array(trainingBlockSchema),
    exerciseMovements: z.array(exerciseMovementSchema),
    setRecords: z.array(setRecordSchema),
  }),
});

export interface HormeBackup {
  format: "horme-backup";
  schemaVersion: 1;
  exportedAt: string;
  collections: {
    athleteProfiles: AthleteProfile[];
    bodyMeasurements: BodyMeasurement[];
    exerciseDefinitions: ExerciseDefinition[];
    trainingSessions: TrainingSession[];
    trainingBlocks: TrainingBlock[];
    exerciseMovements: ExerciseMovement[];
    setRecords: SetRecord[];
  };
}

export interface BackupPreview {
  displayName?: string;
  sessionCount: number;
  measurementCount: number;
  firstSessionDate?: string;
  lastSessionDate?: string;
  exportedAt: string;
}

function assertUnique(values: string[], collectionName: string): void {
  if (new Set(values).size !== values.length)
    throw new Error(
      `La colección ${collectionName} contiene identificadores duplicados`,
    );
}

function validateReferences(backup: HormeBackup): void {
  const collections = backup.collections;
  assertUnique(
    collections.athleteProfiles.map((item) => item.athleteProfileId),
    "perfiles",
  );
  assertUnique(
    collections.bodyMeasurements.map((item) => item.bodyMeasurementId),
    "mediciones",
  );
  assertUnique(
    collections.exerciseDefinitions.map((item) => item.exerciseDefinitionId),
    "ejercicios",
  );
  assertUnique(
    collections.trainingSessions.map((item) => item.trainingSessionId),
    "sesiones",
  );
  assertUnique(
    collections.trainingBlocks.map((item) => item.trainingBlockId),
    "bloques",
  );
  assertUnique(
    collections.exerciseMovements.map((item) => item.exerciseMovementId),
    "movimientos",
  );
  assertUnique(
    collections.setRecords.map((item) => item.setRecordId),
    "series",
  );

  const sessionIds = new Set(
    collections.trainingSessions.map((item) => item.trainingSessionId),
  );
  const blockIds = new Set(
    collections.trainingBlocks.map((item) => item.trainingBlockId),
  );
  const exerciseIds = new Set(
    collections.exerciseDefinitions.map((item) => item.exerciseDefinitionId),
  );
  const movementIds = new Set(
    collections.exerciseMovements.map((item) => item.exerciseMovementId),
  );
  if (
    collections.trainingBlocks.some(
      (item) => !sessionIds.has(item.trainingSessionId),
    )
  )
    throw new Error("Hay bloques sin una sesión válida");
  if (
    collections.exerciseMovements.some(
      (item) =>
        !blockIds.has(item.trainingBlockId) ||
        !exerciseIds.has(item.exerciseDefinitionId),
    )
  ) {
    throw new Error("Hay movimientos con referencias no válidas");
  }
  if (
    collections.setRecords.some(
      (item) => !movementIds.has(item.exerciseMovementId),
    )
  )
    throw new Error("Hay series sin un movimiento válido");
}

export function parseBackup(value: unknown): HormeBackup {
  // Con `exactOptionalPropertyTypes` Zod infiere `campo?: T | undefined`; el
  // esquema estricto garantiza que la forma coincide con las entidades.
  const backup = backupSchema.parse(value) as HormeBackup;
  validateReferences(backup);
  return backup;
}

export function previewBackup(value: unknown): BackupPreview {
  const backup = parseBackup(value);
  const dates = backup.collections.trainingSessions
    .map((session) => session.sessionDate)
    .toSorted();
  const firstSessionDate = dates[0];
  const lastSessionDate = dates.at(-1);
  return {
    ...(backup.collections.athleteProfiles[0]?.displayName
      ? { displayName: backup.collections.athleteProfiles[0].displayName }
      : {}),
    sessionCount: backup.collections.trainingSessions.length,
    measurementCount: backup.collections.bodyMeasurements.length,
    ...(firstSessionDate !== undefined ? { firstSessionDate } : {}),
    ...(lastSessionDate !== undefined ? { lastSessionDate } : {}),
    exportedAt: backup.exportedAt,
  };
}

/**
 * Exporta todos los datos. Valida la copia antes de devolverla para no
 * entregar nunca un archivo que después no se pueda restaurar.
 */
export async function createBackup(): Promise<HormeBackup> {
  await initializeDatabase();
  const backup = await database.transaction("r", database.tables, async () => ({
    format: "horme-backup" as const,
    schemaVersion: 1 as const,
    exportedAt: new Date().toISOString(),
    collections: {
      athleteProfiles: await database.athleteProfiles.toArray(),
      bodyMeasurements: await database.bodyMeasurements.toArray(),
      exerciseDefinitions: await database.exerciseDefinitions.toArray(),
      trainingSessions: await database.trainingSessions.toArray(),
      trainingBlocks: await database.trainingBlocks.toArray(),
      exerciseMovements: await database.exerciseMovements.toArray(),
      setRecords: await database.setRecords.toArray(),
    },
  }));
  parseBackup(backup);
  return backup;
}

export async function replaceDatabaseFromBackup(value: unknown): Promise<void> {
  const backup = parseBackup(value);
  await initializeDatabase();
  const collections = backup.collections;
  await database.transaction("rw", database.tables, async () => {
    await Promise.all(database.tables.map((table) => table.clear()));
    await database.athleteProfiles.bulkAdd(collections.athleteProfiles);
    await database.bodyMeasurements.bulkAdd(collections.bodyMeasurements);
    await database.exerciseDefinitions.bulkAdd(collections.exerciseDefinitions);
    await database.trainingSessions.bulkAdd(collections.trainingSessions);
    await database.trainingBlocks.bulkAdd(collections.trainingBlocks);
    await database.exerciseMovements.bulkAdd(collections.exerciseMovements);
    await database.setRecords.bulkAdd(collections.setRecords);
  });
}

export async function markBackupCreated(exportedAt: string): Promise<void> {
  await initializeDatabase();
  const sessionCount = await database.trainingSessions.count();
  await database.applicationMetadata.bulkPut([
    { key: "lastBackupAt", value: exportedAt },
    { key: "sessionCountAtLastBackup", value: String(sessionCount) },
  ]);
}

export interface BackupStatus {
  lastBackupAt?: string;
  shouldRemind: boolean;
  reason?: string;
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const [lastBackup, countAtBackup, currentSessionCount] = await Promise.all([
    database.applicationMetadata.get("lastBackupAt"),
    database.applicationMetadata.get("sessionCountAtLastBackup"),
    database.trainingSessions.count(),
  ]);
  if (!lastBackup)
    return {
      shouldRemind: currentSessionCount > 0,
      ...(currentSessionCount > 0
        ? { reason: "Todavía no has creado una copia" }
        : {}),
    };
  const daysSinceBackup =
    (Date.now() - new Date(lastBackup.value).getTime()) / 86_400_000;
  const sessionsSinceBackup =
    currentSessionCount - Number(countAtBackup?.value ?? 0);
  if (daysSinceBackup >= 14)
    return {
      lastBackupAt: lastBackup.value,
      shouldRemind: true,
      reason: "Han pasado 14 días desde la última copia",
    };
  if (sessionsSinceBackup >= 5)
    return {
      lastBackupAt: lastBackup.value,
      shouldRemind: true,
      reason: "Has registrado cinco sesiones desde la última copia",
    };
  return { lastBackupAt: lastBackup.value, shouldRemind: false };
}

export function getBackupFileName(now = new Date()): string {
  return `horme-backup-${getTodayLocalDate(now)}.json`;
}
