"use client";

import { Check, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ExerciseMetric, SetRecord } from "@/domain/entities";
import { formatDuration, formatNumber } from "@/domain/format";
import { exerciseMetricLabels } from "@/domain/labels";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import { Stepper } from "@/components/ui/stepper";
import { useAction, useToast } from "@/components/ui/toast";
import {
  describeSetValues,
  metricSteppers,
  metricUnit,
  orderedMetrics,
} from "./metrics";
import styles from "./session.module.css";

function formatMetric(metric: ExerciseMetric, value: number): string {
  return metric === "durationSeconds"
    ? formatDuration(value)
    : formatNumber(value);
}

function setLabel(setRecord: SetRecord): string {
  const values = describeSetValues(setRecord);
  return `Serie ${setRecord.position + 1}${values ? `: ${values}` : ""}`;
}

/**
 * Series de un ejercicio. La primera pendiente (o la que toques) se abre con
 * − y + para ajustarla; el resto se leen de un vistazo.
 */
export function SetList({
  sets,
  metrics,
}: {
  sets: SetRecord[];
  metrics: ExerciseMetric[];
}) {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const run = useAction();
  const { show } = useToast();
  const shownMetrics = orderedMetrics(metrics);
  const firstPending = sets.find((setRecord) => !setRecord.isCompleted);
  const expandedId =
    selectedSetId && sets.some((item) => item.setRecordId === selectedSetId)
      ? selectedSetId
      : firstPending?.setRecordId;

  const toggleCompleted = async (setRecord: SetRecord) => {
    const isCompleted = !setRecord.isCompleted;
    if (isCompleted && "vibrate" in navigator) navigator.vibrate(12);
    await run(async () => {
      await trainingSessionRepository.updateSet(setRecord.setRecordId, {
        isCompleted,
      });
      // La siguiente serie hereda las métricas que aún no tenga.
      const next = sets[sets.indexOf(setRecord) + 1];
      if (isCompleted && next && !next.isCompleted) {
        const inherited = Object.fromEntries(
          shownMetrics
            .filter(
              (metric) =>
                next[metric] === undefined && setRecord[metric] !== undefined,
            )
            .map((metric) => [metric, setRecord[metric]]),
        );
        if (Object.keys(inherited).length > 0)
          await trainingSessionRepository.updateSet(
            next.setRecordId,
            inherited,
          );
      }
    });
    setSelectedSetId(null);
  };

  const removeSet = async (setRecord: SetRecord) => {
    const removed = await run(async () => {
      await trainingSessionRepository.removeSet(setRecord.setRecordId);
      return true;
    });
    if (!removed) return;
    setSelectedSetId(null);
    show({
      message: `Serie ${setRecord.position + 1} eliminada`,
      action: {
        label: "Deshacer",
        onAction: () => trainingSessionRepository.restoreSet(setRecord),
      },
    });
  };

  return (
    <ol className={styles.sets}>
      {sets.map((setRecord) => {
        const label = setLabel(setRecord);
        const check = (
          <button
            type="button"
            className={styles.check}
            aria-pressed={setRecord.isCompleted}
            aria-label={`${setRecord.isCompleted ? "Desmarcar" : "Completar"} ${label}`}
            onClick={() => void toggleCompleted(setRecord)}
          >
            <Check aria-hidden="true" strokeWidth={3} />
          </button>
        );
        if (setRecord.setRecordId === expandedId) {
          return (
            <li
              key={setRecord.setRecordId}
              className={`${styles.set} ${styles.active}`}
              data-done={setRecord.isCompleted}
            >
              {check}
              <div className={styles.activeHead}>
                <span className={styles.activeLabel}>
                  Serie {setRecord.position + 1}
                  {setRecord.isCompleted ? ", hecha" : ""}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Eliminar serie ${setRecord.position + 1}`}
                  onClick={() => void removeSet(setRecord)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
              <div className={styles.steppers}>
                {shownMetrics.map((metric) => (
                  <Stepper
                    key={metric}
                    label={exerciseMetricLabels[metric].label}
                    unit={metricUnit(metric)}
                    value={setRecord[metric]}
                    step={metricSteppers[metric].step}
                    integer={metricSteppers[metric].integer}
                    onChange={(value) =>
                      void run(() =>
                        trainingSessionRepository.updateSetMetric(
                          setRecord.setRecordId,
                          metric,
                          value,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            </li>
          );
        }
        return (
          <li
            key={setRecord.setRecordId}
            className={styles.set}
            data-done={setRecord.isCompleted}
          >
            {check}
            <button
              type="button"
              className={styles.values}
              aria-label={`Editar ${label}`}
              onClick={() => setSelectedSetId(setRecord.setRecordId)}
            >
              {shownMetrics.map((metric, index) => (
                <span key={metric} className={styles.valueGroup}>
                  {index > 0 && metric === "weightKilograms" ? (
                    <span className={styles.times} aria-hidden="true">
                      ×
                    </span>
                  ) : null}
                  <span className="figure">
                    {setRecord[metric] === undefined
                      ? "—"
                      : formatMetric(metric, setRecord[metric] ?? 0)}
                    {metric === "durationSeconds" ? null : (
                      <small>{metricUnit(metric)}</small>
                    )}
                  </span>
                </span>
              ))}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
