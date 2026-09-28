import { blockOperations } from "./training-session/blocks";
import { historyOperations } from "./training-session/history";
import { movementOperations } from "./training-session/movements";
import { sessionOperations } from "./training-session/sessions";
import { setOperations } from "./training-session/sets";

export type { TrainingBlockChanges } from "./training-session/blocks";
export type {
  ExerciseHistoryEntry,
  TrainingSessionSummary,
  WodHistoryEntry,
} from "./training-session/history";
export type { ExerciseMovementChanges } from "./training-session/movements";
export type { TrainingSessionChanges } from "./training-session/sessions";
export type { SetRecordChanges, SetValues } from "./training-session/sets";

/** Sesiones de entrenamiento con sus bloques, ejercicios y series. */
export const trainingSessionRepository = {
  ...sessionOperations,
  ...blockOperations,
  ...movementOperations,
  ...setOperations,
  ...historyOperations,
};
