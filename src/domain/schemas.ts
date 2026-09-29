import { z } from "zod";
import {
  displayNameSchema,
  heightCentimetersSchema,
  localDateSchema,
  weightKilogramsSchema,
} from "./validation";

// Mensajes por defecto de Zod en español para las reglas sin texto propio.
z.config(z.locales.es());

/**
 * Fuente única de las reglas que deben cumplir los datos persistidos. Los
 * repositorios validan con estos esquemas antes de escribir y la copia de
 * seguridad los reutiliza al restaurar, así que todo lo que la aplicación
 * guarda se puede volver a importar.
 */

export const exerciseCategories = [
  "fuerza-halterofilia",
  "gimnasia",
  "peso-corporal",
  "monoestructural",
  "material-funcional",
] as const;
export const muscleGroups = [
  "hombro",
  "pecho",
  "espalda",
  "biceps",
  "cuadriceps",
  "isquios",
  "gluteos",
  "gemelos",
  "core-acondicionamiento",
  "cuerpo-completo",
] as const;
export const equipments = [
  "barra",
  "mancuerna",
  "kettlebell",
  "trineo",
  "polea",
  "peso-corporal",
  "ergometro",
  "otro",
] as const;
export const exerciseMetrics = [
  "repetitions",
  "weightKilograms",
  "durationSeconds",
  "distanceMeters",
  "calories",
] as const;
export const trainingBlockTypes = [
  "strength",
  "technique",
  "accessory",
  "wod",
  "free",
] as const;
export const wodFormats = ["for-time", "amrap", "emom", "free"] as const;
export const wodScalings = ["rx", "scaled", "adapted"] as const;

const timestampSchema = z.iso.datetime();
const shortTextSchema = z.string().max(500);
const longTextSchema = z.string().max(10_000);
const nonNegativeSchema = z.number().nonnegative();
const countSchema = z.number().int().nonnegative();

export const perceivedExertionSchema = z.number().int().min(1).max(10);
export const painLevelSchema = z.number().int().min(0).max(10);

export const setMetricSchemas = {
  repetitions: countSchema,
  weightKilograms: nonNegativeSchema,
  durationSeconds: nonNegativeSchema,
  distanceMeters: nonNegativeSchema,
  calories: nonNegativeSchema,
} as const;

export const setValuesSchema = z.strictObject({
  repetitions: setMetricSchemas.repetitions.optional(),
  weightKilograms: setMetricSchemas.weightKilograms.optional(),
  durationSeconds: setMetricSchemas.durationSeconds.optional(),
  distanceMeters: setMetricSchemas.distanceMeters.optional(),
  calories: setMetricSchemas.calories.optional(),
});

export const wodConfigurationSchema = z.strictObject({
  name: shortTextSchema.optional(),
  format: z.enum(wodFormats),
  prescription: longTextSchema.optional(),
  result: shortTextSchema.optional(),
  scaling: z.enum(wodScalings),
  durationSeconds: nonNegativeSchema.optional(),
  timeCapSeconds: nonNegativeSchema.optional(),
  isCompleted: z.boolean().optional(),
  rounds: countSchema.optional(),
  additionalRepetitions: countSchema.optional(),
  plannedRounds: countSchema.optional(),
  completedRounds: countSchema.optional(),
  intervalSeconds: nonNegativeSchema.optional(),
  notes: longTextSchema.optional(),
});

// Cambios admitidos por los repositorios.

export const trainingSessionChangesSchema = z.strictObject({
  sessionDate: localDateSchema.optional(),
  perceivedExertion: perceivedExertionSchema.optional(),
  painLevel: painLevelSchema.optional(),
  feelings: longTextSchema.optional(),
});

export const trainingBlockChangesSchema = z.strictObject({
  title: shortTextSchema.optional(),
  notes: longTextSchema.optional(),
  wodConfiguration: wodConfigurationSchema.optional(),
});

export const exerciseMovementChangesSchema = z.strictObject({
  prescription: longTextSchema.optional(),
  notes: longTextSchema.optional(),
});

export const setRecordChangesSchema = setValuesSchema.extend({
  isCompleted: z.boolean().optional(),
});

const secondaryMuscleGroupsSchema = z.array(z.enum(muscleGroups));

/** Los secundarios no pueden repetirse ni incluir el grupo principal. */
function hasValidSecondaryGroups(exercise: {
  muscleGroup: string;
  secondaryMuscleGroups: string[];
}): boolean {
  return (
    new Set(exercise.secondaryMuscleGroups).size ===
      exercise.secondaryMuscleGroups.length &&
    !exercise.secondaryMuscleGroups.includes(exercise.muscleGroup)
  );
}
const secondaryGroupsMessage =
  "Los grupos secundarios no pueden repetirse ni incluir el principal";

const customExerciseObjectSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, "El ejercicio necesita un nombre")
    .max(60, "El nombre no puede superar 60 caracteres"),
  englishAlias: z.string().trim().max(60),
  muscleGroup: z.enum(muscleGroups),
  secondaryMuscleGroups: secondaryMuscleGroupsSchema.default([]),
  equipment: z.enum(equipments),
  metrics: z
    .array(z.enum(exerciseMetrics))
    .min(1, "Selecciona al menos una métrica"),
});

export const customExerciseInputSchema = customExerciseObjectSchema.refine(
  hasValidSecondaryGroups,
  { message: secondaryGroupsMessage, path: ["secondaryMuscleGroups"] },
);

/** Cambios que admite un ejercicio personalizado ya creado. */
export const customExerciseChangesSchema = customExerciseObjectSchema
  .omit({ metrics: true })
  .refine(hasValidSecondaryGroups, {
    message: secondaryGroupsMessage,
    path: ["secondaryMuscleGroups"],
  });

// Entidades completas, tal y como se guardan y se exportan.

export const athleteProfileSchema = z.strictObject({
  athleteProfileId: z.uuid(),
  displayName: displayNameSchema,
  onboardingCompletedAt: timestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const bodyMeasurementSchema = z
  .strictObject({
    bodyMeasurementId: z.uuid(),
    measurementDate: localDateSchema,
    heightCentimeters: heightCentimetersSchema.optional(),
    weightKilograms: weightKilogramsSchema.optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .refine(
    (measurement) =>
      measurement.heightCentimeters !== undefined ||
      measurement.weightKilograms !== undefined,
    "La medición necesita altura o peso",
  );

export const exerciseDefinitionSchema = z
  .strictObject({
    exerciseDefinitionId: z.string().min(1),
    name: z.string().min(1),
    englishAlias: z.string(),
    category: z.enum(exerciseCategories),
    muscleGroup: z.enum(muscleGroups),
    secondaryMuscleGroups: secondaryMuscleGroupsSchema,
    equipment: z.enum(equipments),
    metrics: z.array(z.enum(exerciseMetrics)).min(1),
    origin: z.enum(["built-in", "custom"]),
    isArchived: z.boolean(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .refine(hasValidSecondaryGroups, {
    message: secondaryGroupsMessage,
    path: ["secondaryMuscleGroups"],
  });

/** Ejercicio de una copia v1, anterior a los grupos musculares. */
export const legacyExerciseDefinitionSchema = z.strictObject({
  exerciseDefinitionId: z.string().min(1),
  name: z.string().min(1),
  englishAlias: z.string(),
  category: z.enum(exerciseCategories),
  metrics: z.array(z.enum(exerciseMetrics)).min(1),
  origin: z.enum(["built-in", "custom"]),
  isArchived: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const trainingSessionSchema = z.strictObject({
  trainingSessionId: z.uuid(),
  sessionDate: localDateSchema,
  status: z.enum(["draft", "completed"]),
  perceivedExertion: perceivedExertionSchema.optional(),
  painLevel: painLevelSchema.optional(),
  feelings: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  completedAt: timestampSchema.optional(),
});

export const trainingBlockSchema = z.strictObject({
  trainingBlockId: z.uuid(),
  trainingSessionId: z.uuid(),
  type: z.enum(trainingBlockTypes),
  title: z.string(),
  position: countSchema,
  notes: z.string().optional(),
  wodConfiguration: wodConfigurationSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const exerciseMovementSchema = z.strictObject({
  exerciseMovementId: z.uuid(),
  trainingBlockId: z.uuid(),
  exerciseDefinitionId: z.string().min(1),
  position: countSchema,
  prescription: z.string().optional(),
  notes: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const setRecordSchema = setValuesSchema.extend({
  setRecordId: z.uuid(),
  exerciseMovementId: z.uuid(),
  position: countSchema,
  isCompleted: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
