import type { BodyMeasurement, SetRecord, TrainingSession } from "./entities";

export interface CurrentBodyValues {
  heightCentimeters?: number;
  weightKilograms?: number;
}

export function getCurrentBodyValues(
  measurements: BodyMeasurement[],
): CurrentBodyValues {
  const chronological = measurements.toSorted(
    (left, right) =>
      right.measurementDate.localeCompare(left.measurementDate) ||
      right.updatedAt.localeCompare(left.updatedAt),
  );
  const height = chronological.find(
    (measurement) => measurement.heightCentimeters !== undefined,
  )?.heightCentimeters;
  const weight = chronological.find(
    (measurement) => measurement.weightKilograms !== undefined,
  )?.weightKilograms;
  return {
    ...(height !== undefined ? { heightCentimeters: height } : {}),
    ...(weight !== undefined ? { weightKilograms: weight } : {}),
  };
}

export function calculateEstimatedOneRepMax(
  repetitions: number,
  weightKilograms: number,
): number | undefined {
  if (repetitions === 1) return weightKilograms;
  if (repetitions < 2 || repetitions > 10 || weightKilograms <= 0)
    return undefined;
  return weightKilograms * (1 + repetitions / 30);
}

export function calculateSetVolume(setRecord: SetRecord): number {
  if (
    !setRecord.isCompleted ||
    setRecord.repetitions === undefined ||
    setRecord.weightKilograms === undefined
  )
    return 0;
  return setRecord.repetitions * setRecord.weightKilograms;
}

export function calculateSessionVolume(setRecords: SetRecord[]): number {
  return setRecords.reduce(
    (total, setRecord) => total + calculateSetVolume(setRecord),
    0,
  );
}

export interface ExercisePerformanceSummary {
  maximumActualWeightKilograms?: number;
  estimatedOneRepMaxKilograms?: number;
  totalVolumeKilograms: number;
  completedSetCount: number;
}

export function summarizeExercisePerformance(
  setRecords: SetRecord[],
): ExercisePerformanceSummary {
  let maximumActualWeightKilograms: number | undefined;
  let estimatedOneRepMaxKilograms: number | undefined;
  let totalVolumeKilograms = 0;
  let completedSetCount = 0;

  for (const setRecord of setRecords) {
    if (!setRecord.isCompleted) continue;
    completedSetCount += 1;
    totalVolumeKilograms += calculateSetVolume(setRecord);
    if (setRecord.weightKilograms !== undefined) {
      maximumActualWeightKilograms = Math.max(
        maximumActualWeightKilograms ?? 0,
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
  }

  return {
    ...(maximumActualWeightKilograms !== undefined
      ? { maximumActualWeightKilograms }
      : {}),
    ...(estimatedOneRepMaxKilograms !== undefined
      ? { estimatedOneRepMaxKilograms }
      : {}),
    totalVolumeKilograms,
    completedSetCount,
  };
}

export function getSessionWellbeingTrend(
  sessions: TrainingSession[],
): Array<{ date: string; perceivedExertion?: number; painLevel?: number }> {
  return sessions
    .filter(
      (session) =>
        session.perceivedExertion !== undefined ||
        session.painLevel !== undefined,
    )
    .toSorted((left, right) =>
      left.sessionDate.localeCompare(right.sessionDate),
    )
    .map((session) => ({
      date: session.sessionDate,
      ...(session.perceivedExertion !== undefined
        ? { perceivedExertion: session.perceivedExertion }
        : {}),
      ...(session.painLevel !== undefined
        ? { painLevel: session.painLevel }
        : {}),
    }));
}
