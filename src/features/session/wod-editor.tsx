"use client";

import { useId, useState } from "react";
import type { TrainingBlock, WodConfiguration } from "@/domain/entities";
import { formatDuration, parseDuration } from "@/domain/format";
import { toOptions, wodFormatLabels, wodScalingLabels } from "@/domain/labels";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import { Segmented } from "@/components/ui/states";
import { Stepper } from "@/components/ui/stepper";
import { useAction } from "@/components/ui/toast";
import styles from "./session.module.css";

/** Tiempo escrito como 4:12 (o 412); se guarda en segundos. */
function DurationField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | undefined;
  placeholder: string;
  onChange: (seconds: number | undefined) => void;
}) {
  const id = useId();
  const [text, setText] = useState(formatDuration(value));
  const [isInvalid, setIsInvalid] = useState(false);
  const [shownValue, setShownValue] = useState(value);
  if (value !== shownValue) {
    setShownValue(value);
    setText(formatDuration(value));
  }
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        className={styles.timeInput}
        inputMode="numeric"
        enterKeyHint="done"
        placeholder={placeholder}
        value={text}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? `${id}-error` : undefined}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const seconds = parseDuration(text);
          if (seconds === null) {
            setIsInvalid(true);
            return;
          }
          setIsInvalid(false);
          setText(formatDuration(seconds));
          if (seconds !== value) onChange(seconds);
        }}
      />
      {isInvalid ? (
        <small id={`${id}-error`} className={styles.fieldError}>
          Escribe el tiempo como 4:12
        </small>
      ) : null}
    </label>
  );
}

function withValue<K extends keyof WodConfiguration>(
  configuration: WodConfiguration,
  key: K,
  value: WodConfiguration[K] | undefined,
): WodConfiguration {
  const next = { ...configuration };
  if (value === undefined || value === "") delete next[key];
  else next[key] = value;
  return next;
}

export function WodEditor({ block }: { block: TrainingBlock }) {
  const run = useAction();
  const [configuration, setConfiguration] = useState<WodConfiguration>(
    block.wodConfiguration ?? { format: "for-time", scaling: "rx" },
  );

  const save = (next: WodConfiguration) => {
    // El resultado de AMRAP y EMOM se deriva para poder comparar WOD.
    let withResult = next;
    if (next.format === "amrap" && next.rounds !== undefined)
      withResult = withValue(
        next,
        "result",
        `${next.rounds} + ${next.additionalRepetitions ?? 0}`,
      );
    if (next.format === "emom" && next.completedRounds !== undefined)
      withResult = withValue(
        next,
        "result",
        next.plannedRounds !== undefined
          ? `${next.completedRounds}/${next.plannedRounds}`
          : String(next.completedRounds),
      );
    setConfiguration(withResult);
    void run(() =>
      trainingSessionRepository.updateBlock(block.trainingBlockId, {
        wodConfiguration: withResult,
      }),
    );
  };

  const set = <K extends keyof WodConfiguration>(
    key: K,
    value: WodConfiguration[K] | undefined,
  ) => save(withValue(configuration, key, value));

  return (
    <div className={styles.wod}>
      <input
        className={styles.wodName}
        aria-label="Nombre del WOD"
        placeholder="Nombre del WOD"
        defaultValue={configuration.name}
        onBlur={(event) => {
          const name = event.target.value.trim();
          if (name !== (configuration.name ?? "")) set("name", name);
        }}
      />
      <div className="field">
        <span className="field-label">Formato</span>
        <Segmented
          label="Formato del WOD"
          options={toOptions(wodFormatLabels)}
          value={configuration.format}
          onChange={(format) => format && set("format", format)}
        />
      </div>
      <label className="field">
        <span>Movimientos</span>
        <textarea
          rows={3}
          defaultValue={configuration.prescription}
          placeholder="21-15-9 de thrusters con 43 kg y dominadas"
          onBlur={(event) =>
            set("prescription", event.target.value.trim() || undefined)
          }
        />
      </label>

      {configuration.format === "for-time" ? (
        <>
          <div className="field-row">
            <DurationField
              label="Límite de tiempo"
              placeholder="10:00"
              value={configuration.timeCapSeconds}
              onChange={(seconds) => set("timeCapSeconds", seconds)}
            />
            <DurationField
              label="Tu tiempo"
              placeholder="4:12"
              value={
                configuration.result
                  ? (parseDuration(configuration.result) ?? undefined)
                  : undefined
              }
              onChange={(seconds) =>
                set(
                  "result",
                  seconds === undefined ? undefined : formatDuration(seconds),
                )
              }
            />
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={configuration.isCompleted ?? false}
              onChange={(event) =>
                set("isCompleted", event.target.checked || undefined)
              }
            />
            <span>Terminado dentro del límite</span>
          </label>
        </>
      ) : null}

      {configuration.format === "amrap" ? (
        <>
          <DurationField
            label="Duración"
            placeholder="20:00"
            value={configuration.durationSeconds}
            onChange={(seconds) => set("durationSeconds", seconds)}
          />
          <div className={styles.steppers}>
            <Stepper
              label="Rondas"
              unit="rondas"
              step={1}
              integer
              value={configuration.rounds}
              onChange={(value) => set("rounds", value)}
            />
            <Stepper
              label="Repeticiones extra"
              unit="rep"
              step={1}
              integer
              value={configuration.additionalRepetitions}
              onChange={(value) => set("additionalRepetitions", value)}
            />
          </div>
        </>
      ) : null}

      {configuration.format === "emom" ? (
        <>
          <DurationField
            label="Cada"
            placeholder="1:00"
            value={configuration.intervalSeconds}
            onChange={(seconds) => set("intervalSeconds", seconds)}
          />
          <div className={styles.steppers}>
            <Stepper
              label="Rondas previstas"
              unit="rondas"
              step={1}
              integer
              value={configuration.plannedRounds}
              onChange={(value) => set("plannedRounds", value)}
            />
            <Stepper
              label="Rondas completas"
              unit="rondas"
              step={1}
              integer
              value={configuration.completedRounds}
              onChange={(value) => set("completedRounds", value)}
            />
          </div>
        </>
      ) : null}

      {configuration.format === "free" ? (
        <label className="field">
          <span>Resultado</span>
          <input
            defaultValue={configuration.result}
            placeholder="Lo que quieras apuntar"
            onBlur={(event) =>
              set("result", event.target.value.trim() || undefined)
            }
          />
        </label>
      ) : null}

      <div className="field">
        <span className="field-label">Modalidad</span>
        <Segmented
          label="Modalidad"
          tone="olive"
          options={toOptions(wodScalingLabels)}
          value={configuration.scaling}
          onChange={(scaling) => scaling && set("scaling", scaling)}
        />
      </div>
      <label className="field">
        <span>Notas</span>
        <textarea
          rows={2}
          defaultValue={configuration.notes}
          placeholder="Escalado, sensaciones…"
          onBlur={(event) =>
            set("notes", event.target.value.trim() || undefined)
          }
        />
      </label>
    </div>
  );
}
