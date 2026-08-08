export type IsoTimestamp = string;
export type LocalDate = string;

export interface AthleteProfile {
  athleteProfileId: string;
  displayName: string;
  onboardingCompletedAt: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface BodyMeasurement {
  bodyMeasurementId: string;
  measurementDate: LocalDate;
  heightCentimeters?: number;
  weightKilograms?: number;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export type ExerciseCategory =
  | "fuerza-halterofilia"
  | "gimnasia"
  | "peso-corporal"
  | "monoestructural"
  | "material-funcional";

export type ExerciseMetric =
  | "repetitions"
  | "weightKilograms"
  | "durationSeconds"
  | "distanceMeters"
  | "calories";

export interface ExerciseDefinition {
  exerciseDefinitionId: string;
  name: string;
  englishAlias: string;
  category: ExerciseCategory;
  metrics: ExerciseMetric[];
  origin: "built-in" | "custom";
  isArchived: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export type TrainingSessionStatus = "draft" | "completed";

export interface TrainingSession {
  trainingSessionId: string;
  sessionDate: LocalDate;
  status: TrainingSessionStatus;
  perceivedExertion?: number;
  painLevel?: number;
  feelings?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  completedAt?: IsoTimestamp;
}

export type TrainingBlockType =
  | "strength"
  | "technique"
  | "accessory"
  | "wod"
  | "free";
export type WodFormat = "for-time" | "amrap" | "emom" | "free";
export type WodScaling = "rx" | "scaled" | "adapted";

export interface WodConfiguration {
  name?: string;
  format: WodFormat;
  prescription?: string;
  result?: string;
  scaling: WodScaling;
  durationSeconds?: number;
  timeCapSeconds?: number;
  isCompleted?: boolean;
  rounds?: number;
  additionalRepetitions?: number;
  plannedRounds?: number;
  completedRounds?: number;
  intervalSeconds?: number;
  notes?: string;
}

export interface TrainingBlock {
  trainingBlockId: string;
  trainingSessionId: string;
  type: TrainingBlockType;
  title: string;
  position: number;
  notes?: string;
  wodConfiguration?: WodConfiguration;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface ExerciseMovement {
  exerciseMovementId: string;
  trainingBlockId: string;
  exerciseDefinitionId: string;
  position: number;
  prescription?: string;
  notes?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface SetRecord {
  setRecordId: string;
  exerciseMovementId: string;
  position: number;
  repetitions?: number;
  weightKilograms?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  calories?: number;
  isCompleted: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface ApplicationMetadata {
  key: "lastBackupAt" | "sessionCountAtLastBackup";
  value: string;
}

export interface TrainingSessionAggregate {
  session: TrainingSession;
  blocks: Array<{
    block: TrainingBlock;
    movements: Array<{
      movement: ExerciseMovement;
      exercise: ExerciseDefinition;
      sets: SetRecord[];
    }>;
  }>;
}
