import {
  calculateEstimatedOneRepMax,
  calculateSessionVolume,
  summarizeExercisePerformance,
} from "@/domain/calculations";
import type { ExerciseDefinition, SetRecord } from "@/domain/entities";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";

export interface ExerciseProgressSummary {
  exercise: ExerciseDefinition;
  maximumActualWeightKilograms?: number;
  estimatedOneRepMaxKilograms?: number;
  totalVolumeKilograms: number;
  completedSetCount: number;
  latestSessionDate: string;
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
      const sets = history.flatMap((entry) => entry.sets);
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
      const completedSets = entry.sets.filter(
        (setRecord) => setRecord.isCompleted,
      );
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
