import type { ExerciseMetric, SetRecord } from "@/domain/entities";
import { formatDuration, formatNumber } from "@/domain/format";
import { exerciseMetricLabels } from "@/domain/labels";

/** Paso de − y + y si la métrica solo admite enteros. */
export const metricSteppers: Record<
  ExerciseMetric,
  { step: number; integer: boolean }
> = {
  repetitions: { step: 1, integer: true },
  weightKilograms: { step: 2.5, integer: false },
  durationSeconds: { step: 5, integer: true },
  distanceMeters: { step: 10, integer: true },
  calories: { step: 1, integer: true },
};

export const metricOrder: ExerciseMetric[] = [
  "repetitions",
  "weightKilograms",
  "durationSeconds",
  "distanceMeters",
  "calories",
];

export function orderedMetrics(metrics: ExerciseMetric[]): ExerciseMetric[] {
  return metricOrder.filter((metric) => metrics.includes(metric));
}

/** Una serie en pocas palabras: «3 × 100 kg», «500 m en 1:45». */
export function describeSetValues(setRecord: SetRecord): string {
  const { repetitions, weightKilograms, durationSeconds, distanceMeters } =
    setRecord;
  const parts: string[] = [];
  if (repetitions !== undefined && weightKilograms !== undefined)
    parts.push(`${repetitions} × ${formatNumber(weightKilograms)} kg`);
  else if (repetitions !== undefined) parts.push(`${repetitions} rep`);
  else if (weightKilograms !== undefined)
    parts.push(`${formatNumber(weightKilograms)} kg`);
  if (distanceMeters !== undefined)
    parts.push(`${formatNumber(distanceMeters)} m`);
  if (durationSeconds !== undefined)
    parts.push(
      parts.length > 0
        ? `en ${formatDuration(durationSeconds)}`
        : formatDuration(durationSeconds),
    );
  if (setRecord.calories !== undefined)
    parts.push(`${formatNumber(setRecord.calories)} cal`);
  return parts.join(" ");
}

/** Resumen de varias series sin repetir las iguales: «3 × 100 kg, 3 × 102,5 kg». */
export function describeSets(setRecords: SetRecord[]): string {
  const descriptions = [
    ...new Set(setRecords.map(describeSetValues).filter(Boolean)),
  ];
  if (descriptions.length === 0) return "";
  return descriptions.length > 3
    ? `${descriptions.slice(0, 3).join(", ")}…`
    : descriptions.join(", ");
}

export function metricUnit(metric: ExerciseMetric): string {
  return exerciseMetricLabels[metric].unit;
}
