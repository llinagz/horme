import type {
  ExerciseCategory,
  ExerciseMetric,
  TrainingBlockType,
  WodFormat,
  WodScaling,
} from "./entities";

/** Nombre del tipo de bloque en selectores y botones. */
export const trainingBlockTypeLabels: Record<TrainingBlockType, string> = {
  strength: "Fuerza",
  technique: "Técnica",
  accessory: "Accesorios",
  wod: "WOD",
  free: "Libre",
};

/** Título con el que nace un bloque nuevo. */
export const trainingBlockTitles: Record<TrainingBlockType, string> = {
  ...trainingBlockTypeLabels,
  free: "Bloque libre",
};

export const exerciseMetricLabels: Record<
  ExerciseMetric,
  { label: string; shortLabel: string; unit: string }
> = {
  repetitions: { label: "Repeticiones", shortLabel: "Reps", unit: "rep" },
  weightKilograms: { label: "Carga", shortLabel: "Carga", unit: "kg" },
  durationSeconds: { label: "Tiempo", shortLabel: "Tiempo", unit: "s" },
  distanceMeters: { label: "Distancia", shortLabel: "Distancia", unit: "m" },
  calories: { label: "Calorías", shortLabel: "Calorías", unit: "cal" },
};

export const exerciseCategoryLabels: Record<ExerciseCategory, string> = {
  "fuerza-halterofilia": "Fuerza y halterofilia",
  gimnasia: "Gimnasia",
  "peso-corporal": "Peso corporal",
  monoestructural: "Monoestructural",
  "material-funcional": "Material funcional",
};

export const wodFormatLabels: Record<WodFormat, string> = {
  "for-time": "For Time",
  amrap: "AMRAP",
  emom: "EMOM",
  free: "Libre",
};

export const wodScalingLabels: Record<WodScaling, string> = {
  rx: "Rx",
  scaled: "Escalado",
  adapted: "Adaptado",
};

/** Opciones `{ value, label }` en el orden de declaración. */
export function toOptions<T extends string>(
  labels: Record<T, string>,
): Array<{ value: T; label: string }> {
  return (Object.entries(labels) as Array<[T, string]>).map(
    ([value, label]) => ({ value, label }),
  );
}
