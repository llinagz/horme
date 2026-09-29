import {
  calculateEstimatedOneRepMax,
  calculateSessionVolume,
  mergeKnownLifts,
  summarizeExercisePerformance,
} from "@/domain/calculations";
import type {
  ExerciseDefinition,
  KnownLift,
  SetRecord,
} from "@/domain/entities";
import { exerciseDefinitionRepository } from "@/infrastructure/repositories/exercise-definition-repository";
import { knownLiftRepository } from "@/infrastructure/repositories/known-lift-repository";
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
  knownLiftCount: number;
  /** Última sesión o marca con fecha; vacío si no hay ninguna. */
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
  const [withHistory, histories, liftsByExercise] = await Promise.all([
    trainingSessionRepository.listExerciseDefinitionsWithHistory(),
    trainingSessionRepository.listAllExerciseHistories(),
    knownLiftRepository.listAll(),
  ]);
  // Un ejercicio con solo marcas registradas también tiene ficha y progreso.
  const known = new Set(withHistory.map((item) => item.exerciseDefinitionId));
  const liftOnly = (
    await Promise.all(
      [...liftsByExercise.keys()]
        .filter((id) => !known.has(id))
        .map((id) => exerciseDefinitionRepository.get(id)),
    )
  ).filter((item): item is ExerciseDefinition => item !== undefined);
  return [...withHistory, ...liftOnly]
    .map((exercise) => {
      const history = histories.get(exercise.exerciseDefinitionId) ?? [];
      const lifts = liftsByExercise.get(exercise.exerciseDefinitionId) ?? [];
      const latestLiftDate = lifts.find((lift) => lift.recordDate)?.recordDate;
      return {
        exercise,
        ...mergeKnownLifts(
          summarizeExercisePerformance(getRecordedSets(history)),
          lifts,
        ),
        knownLiftCount: lifts.length,
        latestSessionDate:
          [history[0]?.session.sessionDate, latestLiftDate]
            .filter((date): date is string => date !== undefined)
            .toSorted()
            .at(-1) ?? "",
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

/**
 * Un punto por día con datos, en orden cronológico, para las gráficas. Las
 * marcas registradas con fecha aportan carga y 1RM pero no volumen; las que no
 * tienen fecha no salen porque no se pueden situar en el tiempo.
 */
export function getExerciseProgressPoints(
  history: ExerciseHistoryEntry[],
  lifts: KnownLift[] = [],
): ExerciseProgressPoint[] {
  const points = new Map<string, ExerciseProgressPoint>();
  const add = (point: ExerciseProgressPoint) => {
    const current = points.get(point.date);
    if (!current) {
      points.set(point.date, point);
      return;
    }
    const maximumWeightKilograms = maxDefined(
      current.maximumWeightKilograms,
      point.maximumWeightKilograms,
    );
    const estimatedOneRepMaxKilograms = maxDefined(
      current.estimatedOneRepMaxKilograms,
      point.estimatedOneRepMaxKilograms,
    );
    points.set(point.date, {
      date: point.date,
      volumeKilograms: current.volumeKilograms + point.volumeKilograms,
      ...(estimatedOneRepMaxKilograms !== undefined
        ? { estimatedOneRepMaxKilograms }
        : {}),
      ...(maximumWeightKilograms !== undefined
        ? { maximumWeightKilograms }
        : {}),
    });
  };
  for (const entry of history) {
    const completedSets = getRecordedSets([entry]);
    const summary = summarizeExercisePerformance(completedSets);
    add({
      date: entry.session.sessionDate,
      volumeKilograms: calculateSessionVolume(completedSets),
      ...(summary.estimatedOneRepMaxKilograms !== undefined
        ? { estimatedOneRepMaxKilograms: summary.estimatedOneRepMaxKilograms }
        : {}),
      ...(summary.maximumActualWeightKilograms !== undefined
        ? { maximumWeightKilograms: summary.maximumActualWeightKilograms }
        : {}),
    });
  }
  for (const lift of lifts) {
    if (lift.recordDate === undefined) continue;
    const estimate = calculateEstimatedOneRepMax(
      lift.repetitions,
      lift.weightKilograms,
    );
    add({
      date: lift.recordDate,
      volumeKilograms: 0,
      maximumWeightKilograms: lift.weightKilograms,
      ...(estimate !== undefined
        ? { estimatedOneRepMaxKilograms: estimate }
        : {}),
    });
  }
  return [...points.values()].toSorted((left, right) =>
    left.date.localeCompare(right.date),
  );
}

function maxDefined(
  left: number | undefined,
  right: number | undefined,
): number | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return Math.max(left, right);
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
