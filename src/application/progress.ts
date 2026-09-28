import {
  calculateSessionVolume,
  summarizeExercisePerformance,
} from "@/domain/calculations";
import type { ExerciseDefinition, SetRecord } from "@/domain/entities";
import {
  trainingSessionRepository,
  type ExerciseHistoryEntry,
} from "@/infrastructure/repositories/training-session-repository";

export interface ExerciseProgressSummary {
  exercise: ExerciseDefinition;
  maximumActualWeightKilograms?: number;
  estimatedOneRepMaxKilograms?: number;
  totalVolumeKilograms: number;
  completedSetCount: number;
  latestSessionDate: string;
}

function hasRecordedMetric(setRecord: SetRecord): boolean {
  return (
    setRecord.repetitions !== undefined ||
    setRecord.weightKilograms !== undefined ||
    setRecord.durationSeconds !== undefined ||
    setRecord.distanceMeters !== undefined ||
    setRecord.calories !== undefined
  );
}

/**
 * Series que cuentan para el progreso: las marcadas como hechas y, en sesiones
 * finalizadas, también las que tienen datos aunque no se marcaran una a una.
 */
export function getRecordedSets(history: ExerciseHistoryEntry[]): SetRecord[] {
  return history.flatMap(({ session, sets }) =>
    sets.flatMap((setRecord) => {
      const isRecorded =
        setRecord.isCompleted ||
        (session.status === "completed" && hasRecordedMetric(setRecord));
      return isRecorded ? [{ ...setRecord, isCompleted: true }] : [];
    }),
  );
}

export async function listExerciseProgress(): Promise<
  ExerciseProgressSummary[]
> {
  const [definitions, histories] = await Promise.all([
    trainingSessionRepository.listExerciseDefinitionsWithHistory(),
    trainingSessionRepository.listAllExerciseHistories(),
  ]);
  return definitions
    .map((exercise) => {
      const history = histories.get(exercise.exerciseDefinitionId) ?? [];
      return {
        exercise,
        ...summarizeExercisePerformance(getRecordedSets(history)),
        latestSessionDate: history[0]?.session.sessionDate ?? "",
      };
    })
    .toSorted((left, right) =>
      right.latestSessionDate.localeCompare(left.latestSessionDate),
    );
}

export interface ExerciseProgressPoint {
  date: string;
  volumeKilograms: number;
  estimatedOneRepMaxKilograms?: number;
  maximumWeightKilograms?: number;
}

/** Un punto por sesión, en orden cronológico, para las gráficas. */
export function getExerciseProgressPoints(
  history: ExerciseHistoryEntry[],
): ExerciseProgressPoint[] {
  return history
    .map((entry) => {
      const completedSets = getRecordedSets([entry]);
      const summary = summarizeExercisePerformance(completedSets);
      return {
        date: entry.session.sessionDate,
        volumeKilograms: calculateSessionVolume(completedSets),
        ...(summary.estimatedOneRepMaxKilograms !== undefined
          ? { estimatedOneRepMaxKilograms: summary.estimatedOneRepMaxKilograms }
          : {}),
        ...(summary.maximumActualWeightKilograms !== undefined
          ? { maximumWeightKilograms: summary.maximumActualWeightKilograms }
          : {}),
      };
    })
    .toSorted((left, right) => left.date.localeCompare(right.date));
}

export function describeSet(setRecord: SetRecord): string {
  const parts: string[] = [];
  if (setRecord.repetitions !== undefined)
    parts.push(`${setRecord.repetitions} rep`);
  if (setRecord.weightKilograms !== undefined)
    parts.push(`${setRecord.weightKilograms} kg`);
  if (setRecord.durationSeconds !== undefined)
    parts.push(`${setRecord.durationSeconds} s`);
  if (setRecord.distanceMeters !== undefined)
    parts.push(`${setRecord.distanceMeters} m`);
  if (setRecord.calories !== undefined) parts.push(`${setRecord.calories} cal`);
  return parts.join(" · ") || "Sin datos";
}
