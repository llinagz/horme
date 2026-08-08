import {
  calculateEstimatedOneRepMax,
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
  const definitions =
    await trainingSessionRepository.listExerciseDefinitionsWithHistory();
  const summaries = await Promise.all(
    definitions.map(async (exercise) => {
      const history = await trainingSessionRepository.listExerciseHistory(
        exercise.exerciseDefinitionId,
      );
      const sets = getRecordedSets(history);
      return {
        exercise,
        ...summarizeExercisePerformance(sets),
        latestSessionDate: history[0]?.session.sessionDate ?? "",
      };
    }),
  );
  return summaries.toSorted((left, right) =>
    right.latestSessionDate.localeCompare(left.latestSessionDate),
  );
}

export interface ExerciseProgressPoint {
  date: string;
  volumeKilograms: number;
  estimatedOneRepMaxKilograms?: number;
  maximumWeightKilograms?: number;
}

export async function getExerciseProgressPoints(
  exerciseDefinitionId: string,
): Promise<ExerciseProgressPoint[]> {
  const history =
    await trainingSessionRepository.listExerciseHistory(exerciseDefinitionId);
  return history
    .map((entry) => {
      const completedSets = getRecordedSets([entry]);
      let estimatedOneRepMaxKilograms: number | undefined;
      let maximumWeightKilograms: number | undefined;
      for (const setRecord of completedSets) {
        if (setRecord.weightKilograms === undefined) continue;
        maximumWeightKilograms = Math.max(
          maximumWeightKilograms ?? 0,
          setRecord.weightKilograms,
        );
        if (setRecord.repetitions !== undefined) {
          const estimate = calculateEstimatedOneRepMax(
            setRecord.repetitions,
            setRecord.weightKilograms,
          );
          if (estimate !== undefined)
            estimatedOneRepMaxKilograms = Math.max(
              estimatedOneRepMaxKilograms ?? 0,
              estimate,
            );
        }
      }
      return {
        date: entry.session.sessionDate,
        volumeKilograms: calculateSessionVolume(completedSets),
        ...(estimatedOneRepMaxKilograms !== undefined
          ? { estimatedOneRepMaxKilograms }
          : {}),
        ...(maximumWeightKilograms !== undefined
          ? { maximumWeightKilograms }
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
