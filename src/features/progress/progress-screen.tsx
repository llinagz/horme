"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { useState } from "react";
import { listExerciseProgress } from "@/application/progress";
import { getSessionWellbeingTrend } from "@/domain/calculations";
import { groupBy } from "@/domain/collections";
import { normalizeWodName } from "@/domain/dates";
import type { ExerciseDefinition } from "@/domain/entities";
import { formatNumber, formatShortDate, pluralize } from "@/domain/format";
import { wodFormatLabels } from "@/domain/labels";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import { useBodyMeasurements } from "@/components/data-hooks";
import { LazyProgressChart } from "@/components/lazy-progress-chart";
import {
  EmptyState,
  Figure,
  LoadingState,
  PageHeader,
} from "@/components/ui/states";
import { ExercisePicker } from "@/features/session/exercise-picker";
import { KnownLiftSheet } from "./known-lift-form";
import styles from "./progress.module.css";

/** Solo tiene sentido registrar una marca en ejercicios que llevan carga. */
const hasLoad = (exercise: ExerciseDefinition) =>
  exercise.metrics.includes("weightKilograms");

export function ProgressScreen() {
  const [isPicking, setIsPicking] = useState(false);
  const [liftExercise, setLiftExercise] = useState<ExerciseDefinition | null>(
    null,
  );
  const exerciseProgress = useLiveQuery(() => listExerciseProgress());
  const sessions = useLiveQuery(() => trainingSessionRepository.list());
  const wodHistory = useLiveQuery(() =>
    trainingSessionRepository.listWodHistory(),
  );
  const measurements = useBodyMeasurements();

  if (
    exerciseProgress === undefined ||
    sessions === undefined ||
    wodHistory === undefined
  )
    return <LoadingState label="Calculando tu progreso…" />;

  const wellbeing = getSessionWellbeingTrend(sessions);
  const weightData = (measurements ?? []).flatMap((item) =>
    item.weightKilograms === undefined
      ? []
      : [{ date: item.measurementDate, weight: item.weightKilograms }],
  );
  const comparableWods = [
    ...groupBy(
      wodHistory,
      (entry) =>
        `${normalizeWodName(entry.block.wodConfiguration?.name ?? "")}::${entry.block.wodConfiguration?.format ?? "free"}`,
    ).values(),
  ].filter((entries) => entries.length > 1);

  return (
    <div className="stack-large">
      <PageHeader title="Progreso" />

      <section className="section">
        <div className="section-head">
          <h2 className="heading">Ejercicios</h2>
          <button
            type="button"
            className="button"
            onClick={() => setIsPicking(true)}
          >
            <Plus aria-hidden="true" />
            Registrar marca
          </button>
        </div>
        {exerciseProgress.length === 0 ? (
          <EmptyState
            title="El progreso empieza con una serie"
            description="Completa una serie en una sesión o registra un peso que ya conozcas, y aquí verás la ficha del ejercicio."
          />
        ) : (
          <div className="list">
            {exerciseProgress.map((summary) => (
              <Link
                key={summary.exercise.exerciseDefinitionId}
                className="list-row"
                href={`/exercise?exerciseDefinitionId=${summary.exercise.exerciseDefinitionId}`}
              >
                <div>
                  <strong>{summary.exercise.name}</strong>
                  <p>
                    {summary.estimatedOneRepMaxKilograms !== undefined
                      ? `1RM estimado ${formatNumber(Math.round(summary.estimatedOneRepMaxKilograms))} kg`
                      : summary.completedSetCount > 0
                        ? `${summary.completedSetCount} series registradas`
                        : pluralize(
                            summary.knownLiftCount,
                            "marca registrada",
                            "marcas registradas",
                          )}
                  </p>
                </div>
                {summary.maximumActualWeightKilograms !== undefined ? (
                  <Figure
                    className="record"
                    value={formatNumber(summary.maximumActualWeightKilograms)}
                    unit="kg"
                  />
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="heading">Esfuerzo y dolor</h2>
        <LazyProgressChart
          title="Esfuerzo percibido y dolor por sesión"
          data={wellbeing}
          series={[
            { dataKey: "perceivedExertion", label: "RPE", tone: "olive" },
            { dataKey: "painLevel", label: "Dolor", tone: "ink" },
          ]}
          emptyLabel="Valora al menos dos sesiones para ver la tendencia."
        />
      </section>

      <section className="section">
        <h2 className="heading">Peso corporal</h2>
        <LazyProgressChart
          title="Peso corporal"
          data={weightData}
          series={[
            { dataKey: "weight", label: "Peso", tone: "olive", unit: "kg" },
          ]}
          emptyLabel="Añade otra medición en tu perfil para ver la evolución."
        />
      </section>

      {comparableWods.length > 0 ? (
        <section className="section">
          <h2 className="heading">WOD repetidos</h2>
          {comparableWods.map((entries) => {
            const configuration = entries[0]?.block.wodConfiguration;
            return (
              <article
                key={`${configuration?.name}-${configuration?.format}`}
                className="sheet-card"
              >
                <header className={styles.wodHead}>
                  <h3 className="title-md">{configuration?.name}</h3>
                  {configuration ? (
                    <span className="chip">
                      {wodFormatLabels[configuration.format]}
                    </span>
                  ) : null}
                </header>
                <ul className={styles.wodResults}>
                  {entries.map((entry) => (
                    <li key={entry.block.trainingBlockId}>
                      <span>{formatShortDate(entry.session.sessionDate)}</span>
                      <strong>
                        {entry.block.wodConfiguration?.result ||
                          "Sin resultado"}
                      </strong>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>
      ) : null}

      <ExercisePicker
        open={isPicking}
        filter={hasLoad}
        onClose={() => setIsPicking(false)}
        onPick={(exercise) => {
          setIsPicking(false);
          setLiftExercise(exercise);
        }}
      />
      <KnownLiftSheet
        exercise={liftExercise}
        onClose={() => setLiftExercise(null)}
      />
    </div>
  );
}
