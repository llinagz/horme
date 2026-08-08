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
import { database, initializeDatabase } from "./database";

const timestampSchema = z.iso.datetime();
const localDateSchema = z.iso.date();

const athleteProfileSchema = z.strictObject({
  athleteProfileId: z.uuid(),
  displayName: z.string().trim().min(1).max(50),
  onboardingCompletedAt: timestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const bodyMeasurementSchema = z
  .strictObject({
    bodyMeasurementId: z.uuid(),
    measurementDate: localDateSchema,
    heightCentimeters: z.number().min(100).max(250).optional(),
    weightKilograms: z.number().min(30).max(350).optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .refine(
    (measurement) =>
      measurement.heightCentimeters !== undefined ||
      measurement.weightKilograms !== undefined,
  );

const exerciseDefinitionSchema = z.strictObject({
  exerciseDefinitionId: z.string().min(1),
  name: z.string().min(1),
  englishAlias: z.string(),
  category: z.enum([
    "fuerza-halterofilia",
    "gimnasia",
    "peso-corporal",
    "monoestructural",
    "material-funcional",
  ]),
  metrics: z
    .array(
      z.enum([
        "repetitions",
        "weightKilograms",
        "durationSeconds",
        "distanceMeters",
        "calories",
      ]),
    )
    .min(1),
  origin: z.enum(["built-in", "custom"]),
  isArchived: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const trainingSessionSchema = z.strictObject({
  trainingSessionId: z.uuid(),
  sessionDate: localDateSchema,
  status: z.enum(["draft", "completed"]),
  perceivedExertion: z.number().int().min(1).max(10).optional(),
  painLevel: z.number().int().min(0).max(10).optional(),
  feelings: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  completedAt: timestampSchema.optional(),
});

const wodConfigurationSchema = z.strictObject({
  name: z.string().optional(),
  format: z.enum(["for-time", "amrap", "emom", "free"]),
  prescription: z.string().optional(),
  result: z.string().optional(),
  scaling: z.enum(["rx", "scaled", "adapted"]),
  durationSeconds: z.number().nonnegative().optional(),
  timeCapSeconds: z.number().nonnegative().optional(),
  isCompleted: z.boolean().optional(),
  rounds: z.number().int().nonnegative().optional(),
  additionalRepetitions: z.number().int().nonnegative().optional(),
  plannedRounds: z.number().int().nonnegative().optional(),
  completedRounds: z.number().int().nonnegative().optional(),
  intervalSeconds: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

const trainingBlockSchema = z.strictObject({
  trainingBlockId: z.uuid(),
  trainingSessionId: z.uuid(),
  type: z.enum(["strength", "technique", "accessory", "wod", "free"]),
  title: z.string(),
  position: z.number().int().nonnegative(),
  notes: z.string().optional(),
  wodConfiguration: wodConfigurationSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const exerciseMovementSchema = z.strictObject({
  exerciseMovementId: z.uuid(),
  trainingBlockId: z.uuid(),
  exerciseDefinitionId: z.string().min(1),
  position: z.number().int().nonnegative(),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const setRecordSchema = z.strictObject({
  setRecordId: z.uuid(),
  exerciseMovementId: z.uuid(),
  position: z.number().int().nonnegative(),
  repetitions: z.number().int().nonnegative().optional(),
  weightKilograms: z.number().nonnegative().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  distanceMeters: z.number().nonnegative().optional(),
  calories: z.number().nonnegative().optional(),
  isCompleted: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const backupSchema = z.strictObject({
  format: z.literal("horme-backup"),
  schemaVersion: z.literal(1),
  exportedAt: timestampSchema,
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

export async function createBackup(): Promise<HormeBackup> {
  await initializeDatabase();
  return database.transaction("r", database.tables, async () => ({
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
  await initializeDatabase();
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
