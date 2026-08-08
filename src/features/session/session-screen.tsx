"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useState, type FormEvent } from "react";
import type {
  ExerciseDefinition,
  ExerciseMetric,
  SetRecord,
  TrainingBlock,
  TrainingBlockType,
  TrainingSessionAggregate,
  WodConfiguration,
  WodFormat,
  WodScaling,
} from "@/domain/entities";
import { parseLocalizedNumber } from "@/domain/validation";
import { exerciseDefinitionRepository } from "@/infrastructure/repositories/exercise-definition-repository";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import { EmptyState, InlineMessage, PageHeading } from "@/components/ui";

const blockOptions: Array<{ type: TrainingBlockType; label: string }> = [
  { type: "strength", label: "Fuerza" },
  { type: "technique", label: "Técnica" },
  { type: "accessory", label: "Accesorios" },
  { type: "wod", label: "WOD" },
  { type: "free", label: "Libre" },
];

function numericValue(value: FormDataEntryValue | null): number | undefined {
  return typeof value === "string" ? parseLocalizedNumber(value) : undefined;
}

function SetEditor({
  setRecord,
  metrics,
}: {
  setRecord: SetRecord;
  metrics: ExerciseMetric[];
}) {
  const [isCompleted, setIsCompleted] = useState(setRecord.isCompleted);
  const metricFields: Array<{
    key: ExerciseMetric;
    label: string;
    unit: string;
  }> = [
    { key: "repetitions", label: "Reps", unit: "" },
    { key: "weightKilograms", label: "Carga", unit: "kg" },
    { key: "durationSeconds", label: "Tiempo", unit: "s" },
    { key: "distanceMeters", label: "Distancia", unit: "m" },
    { key: "calories", label: "Calorías", unit: "cal" },
  ];
  const handleCompletedChange = (nextIsCompleted: boolean) => {
    setIsCompleted(nextIsCompleted);
    void trainingSessionRepository
      .updateSet(setRecord.setRecordId, { isCompleted: nextIsCompleted })
      .catch(() => setIsCompleted(!nextIsCompleted));
  };
  return (
    <div className={isCompleted ? "set-row completed" : "set-row"}>
      <label className="set-checkbox">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={(event) => handleCompletedChange(event.target.checked)}
        />
        <span>{setRecord.position + 1}</span>
      </label>
      <div className="set-fields">
        {metricFields
          .filter((field) => metrics.includes(field.key))
          .map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <div className="input-with-unit compact">
                <input
                  aria-label={`${field.label} de la serie ${setRecord.position + 1}`}
                  inputMode="decimal"
                  defaultValue={setRecord[field.key]}
                  onBlur={(event) =>
                    void trainingSessionRepository.updateSetMetric(
                      setRecord.setRecordId,
                      field.key,
                      parseLocalizedNumber(event.target.value),
                    )
                  }
                />
                <span>{field.unit}</span>
              </div>
            </label>
          ))}
      </div>
      <button
        type="button"
        className="icon-button danger set-remove-button"
        aria-label={`Eliminar serie ${setRecord.position + 1}`}
        onClick={() =>
          void trainingSessionRepository.removeSet(setRecord.setRecordId)
        }
      >
        ×
      </button>
    </div>
  );
}

function MovementEditor({
  aggregate,
  movementEntry,
}: {
  aggregate: TrainingSessionAggregate;
  movementEntry: TrainingSessionAggregate["blocks"][number]["movements"][number];
}) {
  const { movement, exercise, sets } = movementEntry;
  const [setCount, setSetCount] = useState("3");
  const [repetitions, setRepetitions] = useState("1");
  const [weight, setWeight] = useState("");
  const [lastEntry, setLastEntry] = useState<string | null>(null);

  const handleAddSets = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedRepetitions = parseLocalizedNumber(repetitions);
    const parsedWeight = parseLocalizedNumber(weight);
    await trainingSessionRepository.addRepeatedSets(
      exercise.exerciseDefinitionId ? movement.exerciseMovementId : "",
      Number(setCount),
      {
        ...(parsedRepetitions !== undefined
          ? { repetitions: parsedRepetitions }
          : {}),
        ...(parsedWeight !== undefined
          ? { weightKilograms: parsedWeight }
          : {}),
      },
    );
  };

  const handleShowLast = async () => {
    const entry = await trainingSessionRepository.getLastExerciseEntry(
      exercise.exerciseDefinitionId,
      aggregate.session.trainingSessionId,
    );
    setLastEntry(
      entry
        ? `${entry.session.sessionDate}: ${entry.sets.map((item) => `${item.repetitions ?? "—"} × ${item.weightKilograms ?? "—"} kg`).join(", ")}`
        : "No hay un entrenamiento anterior de este ejercicio",
    );
  };

  return (
    <article className="movement-card">
      <header>
        <div>
          <h4>{exercise.name}</h4>
          <small>{exercise.englishAlias}</small>
        </div>
        <Link
          className="icon-button"
          aria-label={`Abrir progreso de ${exercise.name}`}
          href={`/exercise?exerciseDefinitionId=${exercise.exerciseDefinitionId}`}
        >
          ↗
        </Link>
      </header>
      <label className="field compact-field">
        <span>Prescripción</span>
        <input
          defaultValue={movement.prescription}
          placeholder="P. ej. 3 × 1 a 115 kg"
          onBlur={(event) =>
            void trainingSessionRepository.updateMovement(
              movement.exerciseMovementId,
              { prescription: event.target.value },
            )
          }
        />
      </label>
      <div className="set-list">
        {sets.map((setRecord) => (
          <SetEditor
            key={setRecord.setRecordId}
            setRecord={setRecord}
            metrics={exercise.metrics}
          />
        ))}
      </div>
      <form className="quick-sets" onSubmit={handleAddSets}>
        <label>
          <span>Series</span>
          <input
            aria-label="Número de series"
            inputMode="numeric"
            value={setCount}
            onChange={(event) => setSetCount(event.target.value)}
          />
        </label>
        {exercise.metrics.includes("repetitions") ? (
          <label>
            <span>Reps</span>
            <input
              aria-label="Repeticiones por serie"
              inputMode="numeric"
              value={repetitions}
              onChange={(event) => setRepetitions(event.target.value)}
            />
          </label>
        ) : null}
        {exercise.metrics.includes("weightKilograms") ? (
          <label>
            <span>Kg</span>
            <input
              aria-label="Carga por serie"
              inputMode="decimal"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            />
          </label>
        ) : null}
        <button className="small-button" type="submit">
          Crear iguales
        </button>
      </form>
      <div className="compact-actions left">
        <button
          type="button"
          className="text-button"
          onClick={() =>
            void trainingSessionRepository.repeatLastSet(
              movement.exerciseMovementId,
            )
          }
        >
          + Repetir última
        </button>
        <button type="button" className="text-button" onClick={handleShowLast}>
          Ver sesión anterior
        </button>
      </div>
      {lastEntry ? <p className="context-note">{lastEntry}</p> : null}
      <label className="field block-notes">
        <span>Notas del ejercicio</span>
        <textarea
          defaultValue={movement.notes}
          rows={2}
          onBlur={(event) =>
            void trainingSessionRepository.updateMovement(
              movement.exerciseMovementId,
              { notes: event.target.value },
            )
          }
        />
      </label>
    </article>
  );
}

function WodEditor({ block }: { block: TrainingBlock }) {
  const configuration = block.wodConfiguration ?? {
    format: "for-time",
    scaling: "rx",
  };
  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget);
    const format = String(form.get("format")) as WodFormat;
    const durationSeconds = numericValue(form.get("durationSeconds"));
    const timeCapSeconds = numericValue(form.get("timeCapSeconds"));
    const rounds = numericValue(form.get("rounds"));
    const additionalRepetitions = numericValue(
      form.get("additionalRepetitions"),
    );
    const plannedRounds = numericValue(form.get("plannedRounds"));
    const completedRounds = numericValue(form.get("completedRounds"));
    const intervalSeconds = numericValue(form.get("intervalSeconds"));
    const next: WodConfiguration = {
      name: String(form.get("name") ?? "").trim(),
      format,
      scaling: String(form.get("scaling")) as WodScaling,
      prescription: String(form.get("prescription") ?? ""),
      result: String(form.get("result") ?? ""),
      notes: String(form.get("notes") ?? ""),
      ...(durationSeconds !== undefined ? { durationSeconds } : {}),
      ...(timeCapSeconds !== undefined ? { timeCapSeconds } : {}),
      ...(rounds !== undefined ? { rounds } : {}),
      ...(additionalRepetitions !== undefined ? { additionalRepetitions } : {}),
      ...(plannedRounds !== undefined ? { plannedRounds } : {}),
      ...(completedRounds !== undefined ? { completedRounds } : {}),
      ...(intervalSeconds !== undefined ? { intervalSeconds } : {}),
      ...(form.get("isCompleted") === "on" ? { isCompleted: true } : {}),
    };
    await trainingSessionRepository.updateBlock(block.trainingBlockId, {
      wodConfiguration: next,
    });
  };
  return (
    <form className="wod-form" onBlur={handleSave} onChange={handleSave}>
      <div className="two-columns">
        <label className="field">
          <span>Nombre del WOD</span>
          <input
            name="name"
            defaultValue={configuration.name}
            placeholder="Fran, Helen…"
          />
        </label>
        <label className="field">
          <span>Formato</span>
          <select name="format" defaultValue={configuration.format}>
            <option value="for-time">For Time</option>
            <option value="amrap">AMRAP</option>
            <option value="emom">EMOM</option>
            <option value="free">Libre</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Prescripción</span>
        <textarea
          name="prescription"
          defaultValue={configuration.prescription}
          rows={2}
          placeholder="Movimientos, repeticiones y rondas"
        />
      </label>
      <div className="wod-metrics">
        <label>
          <span>Duración (s)</span>
          <input
            name="durationSeconds"
            inputMode="numeric"
            defaultValue={configuration.durationSeconds}
          />
        </label>
        <label>
          <span>Time cap (s)</span>
          <input
            name="timeCapSeconds"
            inputMode="numeric"
            defaultValue={configuration.timeCapSeconds}
          />
        </label>
        <label>
          <span>Rondas</span>
          <input
            name="rounds"
            inputMode="numeric"
            defaultValue={configuration.rounds}
          />
        </label>
        <label>
          <span>Reps extra</span>
          <input
            name="additionalRepetitions"
            inputMode="numeric"
            defaultValue={configuration.additionalRepetitions}
          />
        </label>
        <label>
          <span>Rondas previstas</span>
          <input
            name="plannedRounds"
            inputMode="numeric"
            defaultValue={configuration.plannedRounds}
          />
        </label>
        <label>
          <span>Rondas completas</span>
          <input
            name="completedRounds"
            inputMode="numeric"
            defaultValue={configuration.completedRounds}
          />
        </label>
        <label>
          <span>Intervalo (s)</span>
          <input
            name="intervalSeconds"
            inputMode="numeric"
            defaultValue={configuration.intervalSeconds}
          />
        </label>
      </div>
      <div className="two-columns">
        <label className="field">
          <span>Resultado</span>
          <input
            name="result"
            defaultValue={configuration.result}
            placeholder="12:34, 7+8…"
          />
        </label>
        <label className="field">
          <span>Modalidad</span>
          <select name="scaling" defaultValue={configuration.scaling}>
            <option value="rx">Rx</option>
            <option value="scaled">Escalado</option>
            <option value="adapted">Adaptado</option>
          </select>
        </label>
      </div>
      <label className="checkbox-field">
        <input
          name="isCompleted"
          type="checkbox"
          defaultChecked={configuration.isCompleted}
        />
        <span>WOD completado</span>
      </label>
      <label className="field">
        <span>Notas WOD</span>
        <textarea name="notes" defaultValue={configuration.notes} rows={2} />
      </label>
    </form>
  );
}

function BlockEditor({
  aggregate,
  blockEntry,
  exercises,
  blockIndex,
}: {
  aggregate: TrainingSessionAggregate;
  blockEntry: TrainingSessionAggregate["blocks"][number];
  exercises: ExerciseDefinition[];
  blockIndex: number;
}) {
  const [selectedExerciseId, setSelectedExerciseId] = useState(
    exercises[0]?.exerciseDefinitionId ?? "",
  );
  const { block, movements } = blockEntry;
  return (
    <section className="training-block">
      <header className="block-header">
        <span className="block-index">
          {String(blockIndex + 1).padStart(2, "0")}
        </span>
        <input
          aria-label="Título del bloque"
          className="block-title-input"
          defaultValue={block.title}
          onBlur={(event) =>
            void trainingSessionRepository.updateBlock(block.trainingBlockId, {
              title: event.target.value,
            })
          }
        />
        <div className="compact-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Subir bloque"
            onClick={() =>
              void trainingSessionRepository.moveBlock(
                block.trainingBlockId,
                -1,
              )
            }
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Bajar bloque"
            onClick={() =>
              void trainingSessionRepository.moveBlock(block.trainingBlockId, 1)
            }
          >
            ↓
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Duplicar bloque"
            onClick={() =>
              void trainingSessionRepository.duplicateBlock(
                block.trainingBlockId,
              )
            }
          >
            ⧉
          </button>
          <button
            type="button"
            className="icon-button danger"
            aria-label="Eliminar bloque"
            onClick={() => {
              if (window.confirm("¿Eliminar este bloque y sus ejercicios?"))
                void trainingSessionRepository.removeBlock(
                  block.trainingBlockId,
                );
            }}
          >
            ×
          </button>
        </div>
      </header>
      {block.type === "wod" ? <WodEditor block={block} /> : null}
      <div className="movement-stack">
        {movements.map((movementEntry) => (
          <MovementEditor
            key={movementEntry.movement.exerciseMovementId}
            aggregate={aggregate}
            movementEntry={movementEntry}
          />
        ))}
      </div>
      <div className="add-movement">
        <select
          aria-label="Ejercicio a añadir"
          value={selectedExerciseId}
          onChange={(event) => setSelectedExerciseId(event.target.value)}
        >
          {exercises.map((exercise) => (
            <option
              value={exercise.exerciseDefinitionId}
              key={exercise.exerciseDefinitionId}
            >
              {exercise.name} · {exercise.englishAlias}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="secondary-button"
          disabled={!selectedExerciseId}
          onClick={() =>
            void trainingSessionRepository.addMovement(
              block.trainingBlockId,
              selectedExerciseId,
            )
          }
        >
          + Añadir ejercicio
        </button>
      </div>
      <label className="field compact-field">
        <span>Notas del bloque</span>
        <textarea
          defaultValue={block.notes}
          rows={2}
          onBlur={(event) =>
            void trainingSessionRepository.updateBlock(block.trainingBlockId, {
              notes: event.target.value,
            })
          }
        />
      </label>
    </section>
  );
}

export function SessionScreen() {
  const router = useRouter();
  const trainingSessionId = useSearchParams().get("trainingSessionId") ?? "";
  const aggregate = useLiveQuery(
    async () =>
      trainingSessionId
        ? ((await trainingSessionRepository.get(trainingSessionId)) ?? null)
        : null,
    [trainingSessionId],
  );
  const exercises = useLiveQuery(
    () => exerciseDefinitionRepository.list(),
    [],
    [],
  );
  const [message, setMessage] = useState("");

  const handleCreate = async () => {
    const createdId = await trainingSessionRepository.create();
    router.replace(`/session?trainingSessionId=${createdId}`);
  };

  if (!trainingSessionId)
    return (
      <EmptyState
        title="Prepara una sesión"
        description="Crea un borrador y añade los bloques a tu ritmo."
        action={
          <button
            type="button"
            className="primary-button"
            onClick={handleCreate}
          >
            Crear sesión
          </button>
        }
      />
    );
  if (aggregate === undefined)
    return <p className="centered-state">Cargando sesión…</p>;
  if (aggregate === null)
    return (
      <EmptyState
        title="Sesión no encontrada"
        description="Puede que ya no exista en este dispositivo."
      />
    );

  const session = aggregate.session;
  const handleToggleCompleted = async () => {
    try {
      if (session.status === "completed")
        await trainingSessionRepository.reopen(session.trainingSessionId);
      else await trainingSessionRepository.complete(session.trainingSessionId);
      setMessage(
        session.status === "completed"
          ? "Sesión reabierta"
          : "Sesión finalizada",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se ha podido actualizar",
      );
    }
  };

  return (
    <div className="stack-large session-page">
      <PageHeading
        eyebrow={
          session.status === "draft"
            ? "Borrador · autoguardado"
            : "Sesión finalizada"
        }
        title="Entrenamiento"
        action={
          <button
            type="button"
            className={
              session.status === "completed"
                ? "secondary-button"
                : "primary-button"
            }
            onClick={handleToggleCompleted}
          >
            {session.status === "completed" ? "Reabrir" : "Finalizar"}
          </button>
        }
      />
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      <section className="session-details form-card">
        <label className="field">
          <span>Fecha</span>
          <input
            type="date"
            defaultValue={session.sessionDate}
            onChange={(event) =>
              void trainingSessionRepository.update(session.trainingSessionId, {
                sessionDate: event.target.value,
              })
            }
          />
        </label>
        <div className="two-columns">
          <label className="field">
            <span>RPE (1–10)</span>
            <select
              defaultValue={session.perceivedExertion ?? ""}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (value)
                  void trainingSessionRepository.update(
                    session.trainingSessionId,
                    { perceivedExertion: value },
                  );
              }}
            >
              <option value="">Sin valorar</option>
              {Array.from({ length: 10 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Dolor (0–10)</span>
            <select
              defaultValue={session.painLevel ?? ""}
              onChange={(event) => {
                if (event.target.value !== "")
                  void trainingSessionRepository.update(
                    session.trainingSessionId,
                    { painLevel: Number(event.target.value) },
                  );
              }}
            >
              <option value="">Sin valorar</option>
              {Array.from({ length: 11 }, (_, index) => (
                <option key={index} value={index}>
                  {index}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Sensaciones</span>
          <textarea
            rows={3}
            defaultValue={session.feelings}
            placeholder="¿Cómo ha ido el entrenamiento?"
            onBlur={(event) =>
              void trainingSessionRepository.update(session.trainingSessionId, {
                feelings: event.target.value,
              })
            }
          />
        </label>
      </section>

      <div className="training-blocks">
        {aggregate.blocks.map((blockEntry, index) => (
          <BlockEditor
            key={blockEntry.block.trainingBlockId}
            aggregate={aggregate}
            blockEntry={blockEntry}
            exercises={exercises}
            blockIndex={index}
          />
        ))}
      </div>
      <section className="add-block-card">
        <h3>Añadir bloque</h3>
        <div>
          {blockOptions.map((option) => (
            <button
              type="button"
              className="block-option"
              key={option.type}
              onClick={() =>
                void trainingSessionRepository.addBlock(
                  session.trainingSessionId,
                  option.type,
                )
              }
            >
              <span>+</span>
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
