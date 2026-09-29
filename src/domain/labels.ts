import type {
  Equipment,
  ExerciseCategory,
  ExerciseMetric,
  MuscleGroup,
  TrainingBlockType,
  WodFormat,
  WodScaling,
} from "./entities";

/** Nombre del tipo de bloque; el orden es el de los selectores y botones. */
export const trainingBlockTypeLabels: Record<TrainingBlockType, string> = {
  strength: "Fuerza",
  accessory: "Accesorios",
  technique: "Técnica",
  free: "Libre",
  wod: "WOD",
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

/** El orden de declaración es el de las secciones del buscador. */
export const muscleGroupLabels: Record<MuscleGroup, string> = {
  hombro: "Hombro",
  pecho: "Pecho",
  espalda: "Espalda",
  biceps: "Bíceps",
  cuadriceps: "Cuádriceps",
  isquios: "Isquios",
  gluteos: "Glúteos",
  gemelos: "Gemelos",
  "core-acondicionamiento": "Core y acondicionamiento",
  "cuerpo-completo": "Cuerpo completo",
};

export const equipmentLabels: Record<Equipment, string> = {
  barra: "Barra",
  mancuerna: "Mancuerna",
  kettlebell: "Kettlebell",
  trineo: "Trineo",
  polea: "Polea",
  "peso-corporal": "Peso corporal",
  ergometro: "Ergómetro",
  otro: "Otro",
};

/** El campo `category` heredado se deduce del material al crear ejercicios. */
export function categoryForEquipment(equipment: Equipment): ExerciseCategory {
  switch (equipment) {
    case "barra":
      return "fuerza-halterofilia";
    case "peso-corporal":
      return "peso-corporal";
    case "ergometro":
      return "monoestructural";
    default:
      return "material-funcional";
  }
}

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
