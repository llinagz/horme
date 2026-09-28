"use client";

import type { TrainingSession } from "@/domain/entities";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import type { TrainingSessionChanges } from "@/infrastructure/repositories/training-session-repository";
import { Segmented } from "@/components/ui/states";
import { useAction } from "@/components/ui/toast";
import styles from "./session.module.css";

const exertionOptions = Array.from({ length: 10 }, (_, index) => ({
  value: index + 1,
  label: String(index + 1),
}));
const painOptions = Array.from({ length: 11 }, (_, index) => ({
  value: index,
  label: String(index),
}));

/** Fecha, esfuerzo percibido, dolor y sensaciones de la sesión. */
export function Wellbeing({ session }: { session: TrainingSession }) {
  const run = useAction();
  const save = (changes: TrainingSessionChanges) =>
    void run(() =>
      trainingSessionRepository.update(session.trainingSessionId, changes),
    );

  return (
    <section className={styles.wellbeing} aria-labelledby="wellbeing-title">
      <h2 id="wellbeing-title" className="heading">
        Cómo ha ido
      </h2>
      <div className="field">
        <span className="field-label">Esfuerzo percibido (RPE)</span>
        <Segmented
          label="Esfuerzo percibido de 1 a 10"
          options={exertionOptions}
          columns={5}
          tone="olive"
          value={session.perceivedExertion}
          allowClear
          onChange={(perceivedExertion) => save({ perceivedExertion })}
        />
      </div>
      <div className="field">
        <span className="field-label">Dolor, de 0 a 10</span>
        <Segmented
          label="Dolor de 0 a 10"
          options={painOptions}
          columns={6}
          tone="olive"
          value={session.painLevel}
          allowClear
          onChange={(painLevel) => save({ painLevel })}
        />
      </div>
      <p className={styles.hint}>Toca de nuevo un número para quitarlo.</p>
      <label className="field">
        <span>Sensaciones</span>
        <textarea
          rows={3}
          defaultValue={session.feelings}
          placeholder="Energía, técnica, molestias…"
          onBlur={(event) => {
            if (event.target.value !== (session.feelings ?? ""))
              save({ feelings: event.target.value });
          }}
        />
      </label>
      <label className="field">
        <span>Fecha</span>
        <input
          type="date"
          required
          defaultValue={session.sessionDate}
          onChange={(event) => {
            // Vaciar el campo no borra la fecha: se conserva la anterior.
            if (event.target.value) save({ sessionDate: event.target.value });
          }}
        />
      </label>
    </section>
  );
}
