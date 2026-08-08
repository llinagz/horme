"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { listExerciseProgress } from "@/application/progress";
import { getSessionWellbeingTrend } from "@/domain/calculations";
import { normalizeWodName } from "@/domain/dates";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import { useBodyMeasurements } from "@/components/data-hooks";
import { EmptyState, PageHeading, SectionHeading } from "@/components/ui";

const ProgressChart = dynamic(
  () =>
    import("@/components/progress-chart").then(
      (module) => module.ProgressChart,
    ),
  { ssr: false },
);

export function ProgressScreen() {
  const exerciseProgress = useLiveQuery(() => listExerciseProgress(), [], []);
  const sessions = useLiveQuery(() => trainingSessionRepository.list(), [], []);
  const wodHistory = useLiveQuery(
    () => trainingSessionRepository.listWodHistory(),
    [],
    [],
  );
  const measurements = useBodyMeasurements();
  const wellbeing = getSessionWellbeingTrend(sessions);
  const weightData = measurements.flatMap((item) =>
    item.weightKilograms === undefined
      ? []
      : [{ date: item.measurementDate, weight: item.weightKilograms }],
  );
  const wodGroups = Map.groupBy(
    wodHistory,
    (entry) =>
      `${normalizeWodName(entry.block.wodConfiguration?.name ?? "")}::${entry.block.wodConfiguration?.format ?? "free"}`,
  );
  const comparableWods = [...wodGroups.values()].filter(
    (entries) => entries.length > 1,
  );

  return (
    <div className="stack-large">
      <PageHeading
        eyebrow="Tu evolución"
        title="Progreso"
        description="Marcas reales, volumen y sensaciones; sin comparar cuerpos ni inventar métricas."
      />

      <section>
        <SectionHeading title="Progreso deportivo" />
        {exerciseProgress.length === 0 ? (
          <EmptyState
            title="El progreso empieza con una serie"
            description="Registra y completa una serie para ver aquí la ficha del ejercicio."
          />
        ) : (
          <div className="exercise-grid">
            {exerciseProgress.map((summary) => (
              <Link
                className="exercise-progress-card"
                href={`/exercise?exerciseDefinitionId=${summary.exercise.exerciseDefinitionId}`}
                key={summary.exercise.exerciseDefinitionId}
              >
                <span className="category-pill">
                  {summary.exercise.category.replaceAll("-", " ")}
                </span>
                <h3>{summary.exercise.name}</h3>
                <div className="mini-stats">
                  <span>
                    <small>Máxima</small>
                    <strong>
                      {summary.maximumActualWeightKilograms ?? "—"} kg
                    </strong>
                  </span>
                  <span>
                    <small>1RM est.</small>
                    <strong>
                      {summary.estimatedOneRepMaxKilograms
                        ? summary.estimatedOneRepMaxKilograms.toFixed(1)
                        : "—"}{" "}
                      kg
                    </strong>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="chart-card">
        <SectionHeading title="RPE y dolor" />
        <ProgressChart
          data={wellbeing}
          series={[
            { dataKey: "perceivedExertion", label: "RPE", color: "#526246" },
            { dataKey: "painLevel", label: "Dolor", color: "#a75343" },
          ]}
        />
      </section>
      <section className="chart-card">
        <SectionHeading title="Peso" />
        <ProgressChart
          data={weightData}
          series={[
            { dataKey: "weight", label: "Peso", color: "#9a6a3a", unit: " kg" },
          ]}
        />
      </section>

      <section>
        <SectionHeading title="WODs comparables" />
        {comparableWods.length === 0 ? (
          <div className="quiet-card">
            Cuando repitas un WOD con el mismo nombre y formato, sus resultados
            aparecerán juntos.
          </div>
        ) : (
          <div className="list-card">
            {comparableWods.map((entries) => (
              <div
                className="wod-comparison"
                key={`${entries[0]?.block.wodConfiguration?.name}-${entries[0]?.block.wodConfiguration?.format}`}
              >
                <strong>{entries[0]?.block.wodConfiguration?.name}</strong>
                <small>
                  {entries[0]?.block.wodConfiguration?.format.toUpperCase()}
                </small>
                <div>
                  {entries.map((entry) => (
                    <span key={entry.block.trainingBlockId}>
                      {entry.session.sessionDate}:{" "}
                      {entry.block.wodConfiguration?.result || "sin resultado"}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
