import type {
  ExerciseCategory,
  ExerciseDefinition,
  ExerciseMetric,
} from "@/domain/entities";

interface CatalogEntry {
  name: string;
  englishAlias: string;
  category: ExerciseCategory;
  metrics: ExerciseMetric[];
}

const repetitionsAndWeight: ExerciseMetric[] = [
  "repetitions",
  "weightKilograms",
];
const repetitions: ExerciseMetric[] = ["repetitions"];

const catalogEntries: CatalogEntry[] = [
  {
    name: "Sentadilla trasera",
    englishAlias: "Back Squat",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Sentadilla frontal",
    englishAlias: "Front Squat",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Peso muerto",
    englishAlias: "Deadlift",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Press estricto",
    englishAlias: "Strict Press",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Press banca",
    englishAlias: "Bench Press",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Push press",
    englishAlias: "Push Press",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Push jerk",
    englishAlias: "Push Jerk",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Split jerk",
    englishAlias: "Split Jerk",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Cargada",
    englishAlias: "Clean",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Cargada de potencia",
    englishAlias: "Power Clean",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Dos tiempos",
    englishAlias: "Clean and Jerk",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Arrancada",
    englishAlias: "Snatch",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Arrancada de potencia",
    englishAlias: "Power Snatch",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Sentadilla overhead",
    englishAlias: "Overhead Squat",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Remo con barra",
    englishAlias: "Barbell Row",
    category: "fuerza-halterofilia",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Dominada",
    englishAlias: "Pull-up",
    category: "gimnasia",
    metrics: [...repetitions, "weightKilograms"],
  },
  {
    name: "Dominada pecho a barra",
    englishAlias: "Chest-to-bar Pull-up",
    category: "gimnasia",
    metrics: repetitions,
  },
  {
    name: "Muscle-up en anillas",
    englishAlias: "Ring Muscle-up",
    category: "gimnasia",
    metrics: repetitions,
  },
  {
    name: "Muscle-up en barra",
    englishAlias: "Bar Muscle-up",
    category: "gimnasia",
    metrics: repetitions,
  },
  {
    name: "Fondos en anillas",
    englishAlias: "Ring Dip",
    category: "gimnasia",
    metrics: repetitions,
  },
  {
    name: "Pino estático",
    englishAlias: "Handstand Hold",
    category: "gimnasia",
    metrics: ["durationSeconds"],
  },
  {
    name: "Flexión de pino",
    englishAlias: "Handstand Push-up",
    category: "gimnasia",
    metrics: repetitions,
  },
  {
    name: "Caminar en pino",
    englishAlias: "Handstand Walk",
    category: "gimnasia",
    metrics: ["distanceMeters"],
  },
  {
    name: "Elevación de pies a barra",
    englishAlias: "Toes-to-bar",
    category: "gimnasia",
    metrics: repetitions,
  },
  {
    name: "Rodillas a codos",
    englishAlias: "Knees-to-elbows",
    category: "gimnasia",
    metrics: repetitions,
  },
  {
    name: "Flexión",
    englishAlias: "Push-up",
    category: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Burpee",
    englishAlias: "Burpee",
    category: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Sentadilla al aire",
    englishAlias: "Air Squat",
    category: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Zancada",
    englishAlias: "Lunge",
    category: "peso-corporal",
    metrics: [...repetitions, "weightKilograms"],
  },
  {
    name: "Abdominal mariposa",
    englishAlias: "Butterfly Sit-up",
    category: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Subida al cajón",
    englishAlias: "Box Step-up",
    category: "peso-corporal",
    metrics: [...repetitions, "weightKilograms"],
  },
  {
    name: "Salto al cajón",
    englishAlias: "Box Jump",
    category: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Salto doble de comba",
    englishAlias: "Double-under",
    category: "peso-corporal",
    metrics: repetitions,
  },
  {
    name: "Carrera",
    englishAlias: "Run",
    category: "monoestructural",
    metrics: ["durationSeconds", "distanceMeters"],
  },
  {
    name: "Remo",
    englishAlias: "Row",
    category: "monoestructural",
    metrics: ["durationSeconds", "distanceMeters", "calories"],
  },
  {
    name: "Bicicleta de aire",
    englishAlias: "Air Bike",
    category: "monoestructural",
    metrics: ["durationSeconds", "calories"],
  },
  {
    name: "Ski ergómetro",
    englishAlias: "Ski Erg",
    category: "monoestructural",
    metrics: ["durationSeconds", "distanceMeters", "calories"],
  },
  {
    name: "Bicicleta ergómetro",
    englishAlias: "Bike Erg",
    category: "monoestructural",
    metrics: ["durationSeconds", "distanceMeters", "calories"],
  },
  {
    name: "Natación",
    englishAlias: "Swim",
    category: "monoestructural",
    metrics: ["durationSeconds", "distanceMeters"],
  },
  {
    name: "Swing con kettlebell",
    englishAlias: "Kettlebell Swing",
    category: "material-funcional",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Goblet squat",
    englishAlias: "Goblet Squat",
    category: "material-funcional",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Arrancada con mancuerna",
    englishAlias: "Dumbbell Snatch",
    category: "material-funcional",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Cargada con mancuerna",
    englishAlias: "Dumbbell Clean",
    category: "material-funcional",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Thruster",
    englishAlias: "Thruster",
    category: "material-funcional",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Wall ball",
    englishAlias: "Wall Ball",
    category: "material-funcional",
    metrics: repetitionsAndWeight,
  },
  {
    name: "Paseo del granjero",
    englishAlias: "Farmer Carry",
    category: "material-funcional",
    metrics: ["distanceMeters", "weightKilograms"],
  },
  {
    name: "Empuje de trineo",
    englishAlias: "Sled Push",
    category: "material-funcional",
    metrics: ["distanceMeters", "weightKilograms", "durationSeconds"],
  },
  {
    name: "Tirón de trineo",
    englishAlias: "Sled Pull",
    category: "material-funcional",
    metrics: ["distanceMeters", "weightKilograms", "durationSeconds"],
  },
  {
    name: "Subida de cuerda",
    englishAlias: "Rope Climb",
    category: "gimnasia",
    metrics: repetitions,
  },
  {
    name: "Turkish get-up",
    englishAlias: "Turkish Get-up",
    category: "material-funcional",
    metrics: repetitionsAndWeight,
  },
];

export function createBuiltInExercises(
  timestamp: string,
): ExerciseDefinition[] {
  return catalogEntries.map((entry, index) => ({
    exerciseDefinitionId: `built-in-${String(index + 1).padStart(3, "0")}`,
    ...entry,
    origin: "built-in",
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}
