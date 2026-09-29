"use client";

import { useState, type FormEvent } from "react";
import { getTodayLocalDate } from "@/domain/dates";
import type { ExerciseDefinition, KnownLift } from "@/domain/entities";
import { getErrorMessage } from "@/domain/errors";
import { formatNumber } from "@/domain/format";
import { parseLocalizedNumber } from "@/domain/validation";
import { knownLiftRepository } from "@/infrastructure/repositories/known-lift-repository";
import { Sheet } from "@/components/ui/sheet";
import { InlineMessage } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";

/** Marca registrada, como «5 × 100 kg». */
export function describeKnownLift(lift: KnownLift): string {
  return `${lift.repetitions} × ${formatNumber(lift.weightKilograms)} kg`;
}

/**
 * Hoja para registrar o corregir una marca que el usuario ya conocía. La fecha
 * es opcional: quien no la recuerda marca «No recuerdo la fecha».
 */
export function KnownLiftSheet({
  exercise,
  lift,
  onClose,
}: {
  /** `null` mantiene la hoja cerrada. */
  exercise: ExerciseDefinition | null;
  /** Marca que se corrige; sin ella se crea una nueva. */
  lift?: KnownLift | undefined;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={exercise !== null}
      title={lift ? "Corregir marca" : "Registrar marca"}
      onClose={onClose}
    >
      {/* Se monta al abrir la hoja, así el formulario siempre empieza limpio. */}
      {exercise ? (
        <KnownLiftForm exercise={exercise} lift={lift} onClose={onClose} />
      ) : null}
    </Sheet>
  );
}

function KnownLiftForm({
  exercise,
  lift,
  onClose,
}: {
  exercise: ExerciseDefinition;
  lift: KnownLift | undefined;
  onClose: () => void;
}) {
  const { show } = useToast();
  const today = getTodayLocalDate();
  const [weight, setWeight] = useState(
    lift ? formatNumber(lift.weightKilograms) : "",
  );
  const [repetitions, setRepetitions] = useState(
    lift ? String(lift.repetitions) : "",
  );
  const [knowsDate, setKnowsDate] = useState(
    lift ? lift.recordDate !== undefined : true,
  );
  const [recordDate, setRecordDate] = useState(lift?.recordDate ?? today);
  const [notes, setNotes] = useState(lift?.notes ?? "");
  const [error, setError] = useState("");

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedWeight = parseLocalizedNumber(weight);
    const parsedRepetitions = parseLocalizedNumber(repetitions);
    if (parsedWeight === undefined) return setError("Indica el peso");
    if (parsedRepetitions === undefined)
      return setError("Indica las repeticiones");
    const input = {
      exerciseDefinitionId: exercise.exerciseDefinitionId,
      weightKilograms: parsedWeight,
      repetitions: parsedRepetitions,
      ...(knowsDate && recordDate ? { recordDate } : {}),
      ...(notes.trim() ? { notes } : {}),
    };
    try {
      if (lift) await knownLiftRepository.update(lift.knownLiftId, input);
      else await knownLiftRepository.create(input);
      show({ message: lift ? "Marca corregida" : "Marca registrada" });
      onClose();
    } catch (caught) {
      // El error se muestra junto al formulario para poder corregirlo ahí.
      setError(getErrorMessage(caught));
    }
  };

  return (
    <form className="stack" onSubmit={save} noValidate>
      <p className="muted">{exercise.name}</p>
      <div className="field-row">
        <label className="field">
          <span>Peso</span>
          <span className="with-unit">
            <input
              inputMode="decimal"
              value={weight}
              placeholder="100"
              autoFocus
              onChange={(event) => setWeight(event.target.value)}
            />
            <span>kg</span>
          </span>
        </label>
        <label className="field">
          <span>Repeticiones</span>
          <input
            inputMode="numeric"
            value={repetitions}
            placeholder="5"
            onChange={(event) => setRepetitions(event.target.value)}
          />
        </label>
      </div>
      <label className="field">
        <span>Fecha</span>
        <input
          type="date"
          value={recordDate}
          max={today}
          disabled={!knowsDate}
          onChange={(event) => setRecordDate(event.target.value)}
        />
      </label>
      <label className="toggle">
        <input
          type="checkbox"
          checked={!knowsDate}
          onChange={(event) => setKnowsDate(!event.target.checked)}
        />
        <span>No recuerdo la fecha</span>
      </label>
      <label className="field">
        <span>Nota (opcional)</span>
        <input
          value={notes}
          maxLength={200}
          placeholder="Con cinturón, sin calentar…"
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
      <button type="submit" className="button large primary">
        {lift ? "Guardar corrección" : "Guardar marca"}
      </button>
    </form>
  );
}
