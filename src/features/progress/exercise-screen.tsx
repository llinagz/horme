"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import {
  getExerciseProgressPoints,
  getRecordedSets,
} from "@/application/progress";
import {
  mergeKnownLifts,
  summarizeExercisePerformance,
} from "@/domain/calculations";
import type { KnownLift } from "@/domain/entities";
import { classificationLabel } from "@/domain/exercises";
import { formatNumber, formatShortDate, pluralize } from "@/domain/format";
import { exerciseDefinitionRepository } from "@/infrastructure/repositories/exercise-definition-repository";
import { knownLiftRepository } from "@/infrastructure/repositories/known-lift-repository";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import { useKnownLifts } from "@/components/data-hooks";
import { LazyProgressChart } from "@/components/lazy-progress-chart";
import { useConfirm } from "@/components/ui/sheet";
import {
  EmptyState,
  Figure,
  LoadingState,
  PageHeader,
} from "@/components/ui/states";
import { useAction } from "@/components/ui/toast";
import { describeSetValues } from "@/features/session/metrics";
import { describeKnownLift, KnownLiftSheet } from "./known-lift-form";
import styles from "./progress.module.css";

const back = { href: "/progress", label: "Progreso" };

export function ExerciseScreen() {
  const exerciseDefinitionId =
    useSearchParams().get("exerciseDefinitionId") ?? "";
  // `null` distingue «no existe» de `undefined`, que significa «cargando».
  const exercise = useLiveQuery(
    async () =>
      (await exerciseDefinitionRepository.get(exerciseDefinitionId)) ?? null,
    [exerciseDefinitionId],
  );
  const history = useLiveQuery(
    () => trainingSessionRepository.listExerciseHistory(exerciseDefinitionId),
    [exerciseDefinitionId],
  );
  const lifts = useKnownLifts(exerciseDefinitionId);
  const run = useAction();
  const confirm = useConfirm();
  // `undefined` = hoja cerrada; `null` = marca nueva; una marca = corregirla.
  const [editing, setEditing] = useState<KnownLift | null | undefined>();

  if (!exerciseDefinitionId)
    return (
      <EmptyState
        title="Elige un ejercicio"
        description="Abre su ficha desde Progreso."
      />
    );
  if (exercise === undefined || history === undefined || lifts === undefined)
    return <LoadingState label="Cargando la ficha…" />;
  if (exercise === null)
    return (
      <EmptyState
        title="Este ejercicio ya no existe"
        description="Puede que se eliminara al restaurar otra copia."
      />
    );

  const points = getExerciseProgressPoints(history, lifts);
  const summary = mergeKnownLifts(
    summarizeExercisePerformance(getRecordedSets(history)),
    lifts,
  );
  const bestSets = [
    ...history.flatMap((entry) =>
      getRecordedSets([entry]).flatMap((setRecord) =>
        setRecord.weightKilograms === undefined
          ? []
          : [
              {
                key: setRecord.setRecordId,
                label: describeSetValues(setRecord),
                date: entry.session.sessionDate as string | undefined,
                weight: setRecord.weightKilograms,
                repetitions: setRecord.repetitions ?? 0,
                isKnownLift: false,
              },
            ],
      ),
    ),
    ...lifts.map((lift) => ({
      key: lift.knownLiftId,
      label: describeKnownLift(lift),
      date: lift.recordDate,
      weight: lift.weightKilograms,
      repetitions: lift.repetitions,
      isKnownLift: true,
    })),
  ]
    .toSorted(
      (left, right) =>
        right.weight - left.weight || right.repetitions - left.repetitions,
    )
    .slice(0, 3);
  const hasLoad = summary.maximumActualWeightKilograms !== undefined;
  const canRegisterLift =
    exercise.metrics.includes("weightKilograms") || lifts.length > 0;

  const removeLift = async (lift: KnownLift) => {
    const accepted = await confirm({
      title: `¿Eliminar la marca de ${describeKnownLift(lift)}?`,
      confirmLabel: "Eliminar marca",
      tone: "danger",
    });
    if (accepted)
      await run(() => knownLiftRepository.remove(lift.knownLiftId), {
        success: "Marca eliminada",
      });
  };

  return (
    <div className="stack-large">
      <PageHeader
        back={back}
        title={exercise.name}
        subtitle={[
          exercise.englishAlias,
          classificationLabel(exercise),
          pluralize(history.length, "sesión", "sesiones"),
        ]
          .filter(Boolean)
          .join(", ")}
      />

      {hasLoad ? (
        <section className={styles.hero}>
          <Figure
            value={formatNumber(
              Math.round(
                summary.estimatedOneRepMaxKilograms ??
                  summary.maximumActualWeightKilograms ??
                  0,
              ),
            )}
            unit={
              summary.estimatedOneRepMaxKilograms !== undefined
                ? "kg de 1RM estimado"
                : "kg de carga máxima"
            }
          />
          <p className="muted small">
            Carga máxima real{" "}
            {formatNumber(summary.maximumActualWeightKilograms)} kg
            {summary.totalVolumeKilograms > 0
              ? `, volumen total ${formatNumber(Math.round(summary.totalVolumeKilograms))} kg`
              : ""}
          </p>
        </section>
      ) : (
        <p className="muted">
          {pluralize(
            summary.completedSetCount,
            "serie registrada",
            "series registradas",
          )}
        </p>
      )}

      {hasLoad ? (
        <section className="section">
          <h2 className="heading">Evolución</h2>
          <LazyProgressChart
            title={`Evolución de ${exercise.name}`}
            data={points}
            series={[
              {
                dataKey: "estimatedOneRepMaxKilograms",
                label: "1RM estimado",
                tone: "olive",
                unit: "kg",
              },
              {
                dataKey: "maximumWeightKilograms",
                label: "Carga máxima",
                tone: "ink",
                unit: "kg",
              },
            ]}
          />
        </section>
      ) : null}

      {canRegisterLift ? (
        <section className="section">
          <div className="section-head">
            <h2 className="heading">Marcas registradas</h2>
            <button
              type="button"
              className="button"
              onClick={() => setEditing(null)}
            >
              <Plus aria-hidden="true" />
              Registrar marca
            </button>
          </div>
          {lifts.length === 0 ? (
            <p className="muted small">
              ¿Ya conoces tu peso en este ejercicio? Regístralo aquí aunque no
              lo hayas hecho en ninguna sesión.
            </p>
          ) : (
            <div className="list">
              {lifts.map((lift) => (
                <div key={lift.knownLiftId} className="list-row">
                  <div>
                    <strong>{describeKnownLift(lift)}</strong>
                    <p>
                      {lift.recordDate
                        ? formatShortDate(lift.recordDate)
                        : "Sin fecha"}
                      {lift.notes ? `, ${lift.notes}` : ""}
                    </p>
                  </div>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Corregir la marca de ${describeKnownLift(lift)}`}
                      onClick={() => setEditing(lift)}
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Eliminar la marca de ${describeKnownLift(lift)}`}
                      onClick={() => void removeLift(lift)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {bestSets.length > 0 ? (
        <section className="section">
          <h2 className="heading">Mejores series</h2>
          <div className="list">
            {bestSets.map((best, index) => (
              <div key={best.key} className="list-row">
                <div>
                  <strong>{best.label}</strong>
                  <p>
                    {best.date ? formatShortDate(best.date) : "Sin fecha"}
                    {best.isKnownLift ? ", marca registrada" : ""}
                  </p>
                </div>
                {index === 0 ? (
                  <span className="chip bronze">Récord</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2 className="heading">Historial</h2>
        {history.length === 0 ? (
          <p className="muted small">
            {lifts.length > 0
              ? "Aún no lo has hecho en ninguna sesión; tus marcas ya cuentan para el progreso."
              : "Todavía no has hecho este ejercicio en ninguna sesión."}
          </p>
        ) : (
          <div>
            {history.map((entry) => (
              <article
                key={entry.movement.exerciseMovementId}
                className={styles.entry}
              >
                <header className={styles.entryHead}>
                  <strong>{formatShortDate(entry.session.sessionDate)}</strong>
                  <span>{entry.block.title}</span>
                </header>
                <div className={styles.setChips}>
                  {entry.sets.length === 0 ? (
                    <span className="muted small">Sin series</span>
                  ) : (
                    entry.sets.map((setRecord) => (
                      <span
                        key={setRecord.setRecordId}
                        className={
                          setRecord.isCompleted ? "chip olive" : "chip"
                        }
                      >
                        {describeSetValues(setRecord) || "Sin datos"}
                      </span>
                    ))
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <KnownLiftSheet
        exercise={editing === undefined ? null : exercise}
        lift={editing ?? undefined}
        onClose={() => setEditing(undefined)}
      />
    </div>
  );
}
