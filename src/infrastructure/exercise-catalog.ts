import type {
  Equipment,
  ExerciseCategory,
  ExerciseDefinition,
  ExerciseMetric,
  MuscleGroup,
} from "@/domain/entities";

interface CatalogEntry {
  name: string;
  englishAlias: string;
  category: ExerciseCategory;
  muscleGroup: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[];
  equipment: Equipment;
  metrics: ExerciseMetric[];
}

const repetitionsAndWeight: ExerciseMetric[] = [
  "repetitions",
  "weightKilograms",
];
const repetitions: ExerciseMetric[] = ["repetitions"];
const distanceAndWeight: ExerciseMetric[] = [
  "distanceMeters",
  "weightKilograms",
];

/**
 * El identificador de cada ejercicio integrado sale de su posición: los
 * nuevos se añaden siempre al final y nunca se reordena ni se borra nada.
 */
const catalogEntries: CatalogEntry[] = [
  {
    name: "Sentadilla trasera",
    englishAlias: "Back Squat",
    category: "fuerza-halterofilia",
    muscleGroup: "cuadriceps",
    secondaryMuscleGroups: ["gluteos"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Sentadilla frontal",
    englishAlias: "Front Squat",
    category: "fuerza-halterofilia",
    muscleGroup: "cuadriceps",
    secondaryMuscleGroups: ["gluteos"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Peso muerto convencional",
    englishAlias: "Conventional Deadlift",
    category: "fuerza-halterofilia",
    muscleGroup: "espalda",
    secondaryMuscleGroups: ["isquios", "gluteos"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Press estricto con barra",
    englishAlias: "Strict Overhead Press",
    category: "fuerza-halterofilia",
    muscleGroup: "hombro",
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Press de banca con barra",
    englishAlias: "Barbell Bench Press",
    category: "fuerza-halterofilia",
    muscleGroup: "pecho",
    secondaryMuscleGroups: ["hombro"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Push press",
    englishAlias: "Push Press",
    category: "fuerza-halterofilia",
    muscleGroup: "hombro",
    secondaryMuscleGroups: ["cuadriceps"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Push jerk",
    englishAlias: "Push Jerk",
    category: "fuerza-halterofilia",
    muscleGroup: "hombro",
    secondaryMuscleGroups: ["cuadriceps"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Split jerk",
    englishAlias: "Split Jerk",
    category: "fuerza-halterofilia",
    muscleGroup: "hombro",
    secondaryMuscleGroups: ["cuadriceps"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Cargada",
    englishAlias: "Clean",
    category: "fuerza-halterofilia",
    muscleGroup: "cuerpo-completo",
    secondaryMuscleGroups: ["cuadriceps", "gluteos"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Cargada de potencia",
    englishAlias: "Power Clean",
    category: "fuerza-halterofilia",
    muscleGroup: "cuerpo-completo",
    secondaryMuscleGroups: ["cuadriceps", "gluteos"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Dos tiempos",
    englishAlias: "Clean and Jerk",
    category: "fuerza-halterofilia",
    muscleGroup: "cuerpo-completo",
    secondaryMuscleGroups: ["cuadriceps", "gluteos"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Arrancada",
    englishAlias: "Snatch",
    category: "fuerza-halterofilia",
    muscleGroup: "cuerpo-completo",
    secondaryMuscleGroups: ["cuadriceps", "gluteos"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Arrancada de potencia",
    englishAlias: "Power Snatch",
    category: "fuerza-halterofilia",
    muscleGroup: "cuerpo-completo",
    secondaryMuscleGroups: ["cuadriceps", "gluteos"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Sentadilla overhead",
    englishAlias: "Overhead Squat",
    category: "fuerza-halterofilia",
    muscleGroup: "cuadriceps",
    secondaryMuscleGroups: ["gluteos", "hombro", "core-acondicionamiento"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Remo con barra",
    englishAlias: "Barbell Row",
    category: "fuerza-halterofilia",
    muscleGroup: "espalda",
    secondaryMuscleGroups: ["biceps"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Dominada",
    englishAlias: "Pull-up",
    category: "gimnasia",
    muscleGroup: "espalda",
    secondaryMuscleGroups: ["biceps"],
    equipment: "peso-corporal",
    metrics: [...repetitions, "weightKilograms"],
  },
  {
    name: "Dominada pecho a barra",
    englishAlias: "Chest-to-bar Pull-up",
    category: "gimnasia",
    muscleGroup: "espalda",
    secondaryMuscleGroups: ["biceps"],
    equipment: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Muscle-up en anillas",
    englishAlias: "Ring Muscle-up",
    category: "gimnasia",
    muscleGroup: "espalda",
    secondaryMuscleGroups: ["biceps"],
    equipment: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Muscle-up en barra",
    englishAlias: "Bar Muscle-up",
    category: "gimnasia",
    muscleGroup: "espalda",
    secondaryMuscleGroups: ["biceps"],
    equipment: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Fondos en anillas",
    englishAlias: "Ring Dip",
    category: "gimnasia",
    muscleGroup: "pecho",
    secondaryMuscleGroups: ["hombro"],
    equipment: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Pino estático",
    englishAlias: "Handstand Hold",
    category: "gimnasia",
    muscleGroup: "hombro",
    secondaryMuscleGroups: ["core-acondicionamiento"],
    equipment: "peso-corporal",
    metrics: ["durationSeconds"],
  },
  {
    name: "Flexión de pino",
    englishAlias: "Handstand Push-up",
    category: "gimnasia",
    muscleGroup: "hombro",
    secondaryMuscleGroups: ["core-acondicionamiento"],
    equipment: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Caminar en pino",
    englishAlias: "Handstand Walk",
    category: "gimnasia",
    muscleGroup: "hombro",
    secondaryMuscleGroups: ["core-acondicionamiento"],
    equipment: "peso-corporal",
    metrics: ["distanceMeters"],
  },
  {
    name: "Elevación de pies a barra",
    englishAlias: "Toes-to-bar",
    category: "gimnasia",
    muscleGroup: "core-acondicionamiento",
    secondaryMuscleGroups: ["hombro"],
    equipment: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Rodillas a codos",
    englishAlias: "Knees-to-elbows",
    category: "gimnasia",
    muscleGroup: "core-acondicionamiento",
    secondaryMuscleGroups: ["hombro"],
    equipment: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Flexión",
    englishAlias: "Push-up",
    category: "peso-corporal",
    muscleGroup: "pecho",
    secondaryMuscleGroups: ["hombro"],
    equipment: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Burpee",
    englishAlias: "Burpee",
    category: "peso-corporal",
    muscleGroup: "cuerpo-completo",
    equipment: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Sentadilla al aire",
    englishAlias: "Air Squat",
    category: "peso-corporal",
    muscleGroup: "cuadriceps",
    secondaryMuscleGroups: ["gluteos"],
    equipment: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Zancada",
    englishAlias: "Lunge",
    category: "peso-corporal",
    muscleGroup: "cuadriceps",
    secondaryMuscleGroups: ["gluteos"],
    equipment: "peso-corporal",
    metrics: [...repetitions, "weightKilograms"],
  },
  {
    name: "Abdominal mariposa",
    englishAlias: "Butterfly Sit-up",
    category: "peso-corporal",
    muscleGroup: "core-acondicionamiento",
    equipment: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Subida al cajón",
    englishAlias: "Box Step-up",
    category: "peso-corporal",
    muscleGroup: "cuadriceps",
    secondaryMuscleGroups: ["gluteos"],
    equipment: "peso-corporal",
    metrics: [...repetitions, "weightKilograms"],
  },
  {
    name: "Salto al cajón",
    englishAlias: "Box Jump",
    category: "peso-corporal",
    muscleGroup: "cuadriceps",
    secondaryMuscleGroups: ["gluteos", "gemelos"],
    equipment: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Salto doble de comba",
    englishAlias: "Double-under",
    category: "peso-corporal",
    muscleGroup: "core-acondicionamiento",
    secondaryMuscleGroups: ["gemelos"],
    equipment: "otro",
    metrics: repetitions,
  },
  {
    name: "Carrera",
    englishAlias: "Run",
    category: "monoestructural",
    muscleGroup: "core-acondicionamiento",
    equipment: "peso-corporal",
    metrics: ["durationSeconds", "distanceMeters"],
  },
  {
    name: "Remo",
    englishAlias: "Row",
    category: "monoestructural",
    muscleGroup: "core-acondicionamiento",
    equipment: "ergometro",
    metrics: ["durationSeconds", "distanceMeters", "calories"],
  },
  {
    name: "Bicicleta de aire",
    englishAlias: "Air Bike",
    category: "monoestructural",
    muscleGroup: "core-acondicionamiento",
    equipment: "ergometro",
    metrics: ["durationSeconds", "calories"],
  },
  {
    name: "Ski ergómetro",
    englishAlias: "Ski Erg",
    category: "monoestructural",
    muscleGroup: "core-acondicionamiento",
    equipment: "ergometro",
    metrics: ["durationSeconds", "distanceMeters", "calories"],
  },
  {
    name: "Bicicleta ergómetro",
    englishAlias: "Bike Erg",
    category: "monoestructural",
    muscleGroup: "core-acondicionamiento",
    equipment: "ergometro",
    metrics: ["durationSeconds", "distanceMeters", "calories"],
  },
  {
    name: "Natación",
    englishAlias: "Swim",
    category: "monoestructural",
    muscleGroup: "core-acondicionamiento",
    equipment: "otro",
    metrics: ["durationSeconds", "distanceMeters"],
  },
  {
    name: "Swing con kettlebell",
    englishAlias: "Kettlebell Swing",
    category: "material-funcional",
    muscleGroup: "gluteos",
    secondaryMuscleGroups: ["isquios"],
    equipment: "kettlebell",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Goblet squat",
    englishAlias: "Goblet Squat",
    category: "material-funcional",
    muscleGroup: "cuadriceps",
    secondaryMuscleGroups: ["gluteos"],
    equipment: "kettlebell",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Arrancada con mancuerna",
    englishAlias: "Dumbbell Snatch",
    category: "material-funcional",
    muscleGroup: "cuerpo-completo",
    secondaryMuscleGroups: ["cuadriceps", "gluteos"],
    equipment: "mancuerna",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Cargada con mancuerna",
    englishAlias: "Dumbbell Clean",
    category: "material-funcional",
    muscleGroup: "cuerpo-completo",
    secondaryMuscleGroups: ["cuadriceps", "gluteos"],
    equipment: "mancuerna",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Thruster",
    englishAlias: "Thruster",
    category: "fuerza-halterofilia",
    muscleGroup: "cuerpo-completo",
    secondaryMuscleGroups: ["cuadriceps", "hombro"],
    equipment: "barra",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Wall ball",
    englishAlias: "Wall Ball",
    category: "material-funcional",
    muscleGroup: "cuerpo-completo",
    secondaryMuscleGroups: ["cuadriceps", "hombro"],
    equipment: "otro",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Paseo del granjero con kettlebell",
    englishAlias: "Kettlebell Farmer's Walk",
    category: "material-funcional",
    muscleGroup: "core-acondicionamiento",
    equipment: "kettlebell",
    metrics: distanceAndWeight,
  },
  {
    name: "Empuje de trineo",
    englishAlias: "Sled Push",
    category: "material-funcional",
    muscleGroup: "core-acondicionamiento",
    secondaryMuscleGroups: ["cuadriceps", "gluteos"],
    equipment: "trineo",
    metrics: ["distanceMeters", "weightKilograms", "durationSeconds"],
  },
  {
    name: "Tirón de trineo",
    englishAlias: "Sled Pull",
    category: "material-funcional",
    muscleGroup: "core-acondicionamiento",
    secondaryMuscleGroups: ["isquios", "gluteos"],
    equipment: "trineo",
    metrics: ["distanceMeters", "weightKilograms", "durationSeconds"],
  },
  {
    name: "Subida de cuerda",
    englishAlias: "Rope Climb",
    category: "gimnasia",
    muscleGroup: "espalda",
    secondaryMuscleGroups: ["biceps"],
    equipment: "otro",
    metrics: repetitions,
  },
  {
    name: "Turkish get-up",
    englishAlias: "Turkish Get-up",
    category: "material-funcional",
    muscleGroup: "core-acondicionamiento",
    secondaryMuscleGroups: ["hombro"],
    equipment: "kettlebell",
    metrics: repetitionsAndWeight,
  },
  // Ejercicios de fuerza por libre en Openbox (051 en adelante).
  {
    name: "Press de hombro sentado con mancuernas",
    englishAlias: "Seated Dumbbell Shoulder Press",
    category: "material-funcional",
    muscleGroup: "hombro",
    equipment: "mancuerna",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Elevaciones laterales con mancuernas",
    englishAlias: "Dumbbell Lateral Raise",
    category: "material-funcional",
    muscleGroup: "hombro",
    equipment: "mancuerna",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Remo al mentón con kettlebell",
    englishAlias: "Kettlebell High Pull",
    category: "material-funcional",
    muscleGroup: "hombro",
    secondaryMuscleGroups: ["espalda"],
    equipment: "kettlebell",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Press inclinado con mancuernas",
    englishAlias: "Incline Dumbbell Bench Press",
    category: "material-funcional",
    muscleGroup: "pecho",
    secondaryMuscleGroups: ["hombro"],
    equipment: "mancuerna",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Press de banca plano con mancuernas",
    englishAlias: "Flat Dumbbell Bench Press",
    category: "material-funcional",
    muscleGroup: "pecho",
    secondaryMuscleGroups: ["hombro"],
    equipment: "mancuerna",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Remo unilateral con mancuerna",
    englishAlias: "Single-Arm Dumbbell Row",
    category: "material-funcional",
    muscleGroup: "espalda",
    secondaryMuscleGroups: ["biceps"],
    equipment: "mancuerna",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Remo unilateral con kettlebell",
    englishAlias: "Single-Arm Kettlebell Row",
    category: "material-funcional",
    muscleGroup: "espalda",
    secondaryMuscleGroups: ["biceps"],
    equipment: "kettlebell",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Jalón al pecho en polea",
    englishAlias: "Chest-Supported Lat Pulldown",
    category: "material-funcional",
    muscleGroup: "espalda",
    secondaryMuscleGroups: ["biceps"],
    equipment: "polea",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Seal row con mancuernas",
    englishAlias: "Seal Row / Incline Dumbbell Row",
    category: "material-funcional",
    muscleGroup: "espalda",
    secondaryMuscleGroups: ["biceps"],
    equipment: "mancuerna",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Pájaros en banco inclinado",
    englishAlias: "Incline Rear Delt Fly",
    category: "material-funcional",
    muscleGroup: "hombro",
    secondaryMuscleGroups: ["espalda"],
    equipment: "mancuerna",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Subida al cajón con kettlebell",
    englishAlias: "Kettlebell Step-up",
    category: "material-funcional",
    muscleGroup: "cuadriceps",
    secondaryMuscleGroups: ["gluteos"],
    equipment: "kettlebell",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Zancadas caminando con mancuernas",
    englishAlias: "Dumbbell Walking Lunge",
    category: "material-funcional",
    muscleGroup: "cuadriceps",
    secondaryMuscleGroups: ["gluteos"],
    equipment: "mancuerna",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Zancadas estáticas con mancuernas",
    englishAlias: "Dumbbell Lunge",
    category: "material-funcional",
    muscleGroup: "cuadriceps",
    secondaryMuscleGroups: ["gluteos"],
    equipment: "mancuerna",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Suitcase carry con kettlebell",
    englishAlias: "Suitcase Carry",
    category: "material-funcional",
    muscleGroup: "core-acondicionamiento",
    equipment: "kettlebell",
    metrics: distanceAndWeight,
  },
  {
    name: "Curl de bíceps con mancuerna",
    englishAlias: "Dumbbell Bicep Curl",
    category: "material-funcional",
    muscleGroup: "biceps",
    equipment: "mancuerna",
    metrics: repetitionsAndWeight,
  },
];

function builtInId(index: number): string {
  return `built-in-${String(index + 1).padStart(3, "0")}`;
}

export function createBuiltInExercises(
  timestamp: string,
): ExerciseDefinition[] {
  return catalogEntries.map((entry, index) => ({
    exerciseDefinitionId: builtInId(index),
    name: entry.name,
    englishAlias: entry.englishAlias,
    category: entry.category,
    muscleGroup: entry.muscleGroup,
    secondaryMuscleGroups: entry.secondaryMuscleGroups ?? [],
    equipment: entry.equipment,
    metrics: entry.metrics,
    origin: "built-in",
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

/** Ejercicio guardado antes de que existieran los grupos musculares. */
export type ExerciseWithoutMuscleGroups = Omit<
  ExerciseDefinition,
  "muscleGroup" | "secondaryMuscleGroups" | "equipment"
> &
  Partial<
    Pick<
      ExerciseDefinition,
      "muscleGroup" | "secondaryMuscleGroups" | "equipment"
    >
  >;

const fallbackByCategory: Record<
  ExerciseCategory,
  { muscleGroup: MuscleGroup; equipment: Equipment }
> = {
  "fuerza-halterofilia": { muscleGroup: "cuerpo-completo", equipment: "barra" },
  gimnasia: { muscleGroup: "cuerpo-completo", equipment: "peso-corporal" },
  "peso-corporal": {
    muscleGroup: "cuerpo-completo",
    equipment: "peso-corporal",
  },
  monoestructural: {
    muscleGroup: "core-acondicionamiento",
    equipment: "ergometro",
  },
  "material-funcional": { muscleGroup: "cuerpo-completo", equipment: "otro" },
};

/**
 * Completa la clasificación de un ejercicio antiguo. Los integrados toman del
 * catálogo nombre, alias, grupos y material; los personalizados sin
 * clasificar la deducen de su categoría para poder corregirla después.
 */
export function applyCatalogMetadata(
  exercise: ExerciseWithoutMuscleGroups,
): ExerciseDefinition {
  const position = /^built-in-(\d{3})$/.exec(exercise.exerciseDefinitionId);
  const entry =
    exercise.origin === "built-in" && position?.[1]
      ? catalogEntries[Number(position[1]) - 1]
      : undefined;
  if (entry) {
    return {
      ...exercise,
      name: entry.name,
      englishAlias: entry.englishAlias,
      muscleGroup: entry.muscleGroup,
      secondaryMuscleGroups: entry.secondaryMuscleGroups ?? [],
      equipment: entry.equipment,
    };
  }
  const fallback = fallbackByCategory[exercise.category];
  return {
    ...exercise,
    muscleGroup: exercise.muscleGroup ?? fallback.muscleGroup,
    secondaryMuscleGroups: exercise.secondaryMuscleGroups ?? [],
    equipment: exercise.equipment ?? fallback.equipment,
  };
}
