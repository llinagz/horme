import type {
  BodyMeasurement,
  KnownLift,
  SetRecord,
  TrainingSession,
} from "./entities";

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

/**
 * Fechadas de la más reciente a la más antigua y, al final, las que el usuario
 * no sabe fechar. La primera es la marca de referencia.
 */
export function sortKnownLifts(lifts: KnownLift[]): KnownLift[] {
  return lifts.toSorted((left, right) => {
    if (left.recordDate === undefined && right.recordDate === undefined)
      return right.updatedAt.localeCompare(left.updatedAt);
    if (left.recordDate === undefined) return 1;
    if (right.recordDate === undefined) return -1;
    return (
      right.recordDate.localeCompare(left.recordDate) ||
      right.updatedAt.localeCompare(left.updatedAt)
    );
  });
}

/**
 * Combina las marcas registradas con el resumen de las sesiones: solo pueden
 * subir la carga máxima y el 1RM. No suman volumen ni series, porque no son
 * entrenamiento registrado.
 */
export function mergeKnownLifts(
  summary: ExercisePerformanceSummary,
  lifts: KnownLift[],
): ExercisePerformanceSummary {
  let maximumActualWeightKilograms = summary.maximumActualWeightKilograms;
  let estimatedOneRepMaxKilograms = summary.estimatedOneRepMaxKilograms;
  for (const lift of lifts) {
    maximumActualWeightKilograms = Math.max(
      maximumActualWeightKilograms ?? 0,
      lift.weightKilograms,
    );
    const estimate = calculateEstimatedOneRepMax(
      lift.repetitions,
      lift.weightKilograms,
    );
    if (estimate !== undefined)
      estimatedOneRepMaxKilograms = Math.max(
        estimatedOneRepMaxKilograms ?? 0,
        estimate,
      );
  }
  return {
    ...summary,
    ...(maximumActualWeightKilograms !== undefined
      ? { maximumActualWeightKilograms }
      : {}),
    ...(estimatedOneRepMaxKilograms !== undefined
      ? { estimatedOneRepMaxKilograms }
      : {}),
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
