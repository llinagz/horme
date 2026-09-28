"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChartNoAxesCombined, Ellipsis, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { TrainingSessionAggregate } from "@/domain/entities";
import { formatShortDate } from "@/domain/format";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import { Sheet, useConfirm } from "@/components/ui/sheet";
import { useAction } from "@/components/ui/toast";
import { describeSets } from "./metrics";
import { SetList } from "./set-list";
import styles from "./session.module.css";

type MovementEntry =
  TrainingSessionAggregate["blocks"][number]["movements"][number];

export function MovementCard({
  movementEntry,
  trainingSessionId,
}: {
  movementEntry: MovementEntry;
  trainingSessionId: string;
}) {
  const { movement, exercise, sets } = movementEntry;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const run = useAction();
  const confirm = useConfirm();
  const previous = useLiveQuery(
    () =>
      trainingSessionRepository.getLastExerciseEntry(
        exercise.exerciseDefinitionId,
        trainingSessionId,
      ),
    [exercise.exerciseDefinitionId, trainingSessionId],
  );
  const previousSummary = previous ? describeSets(previous.sets) : "";

  const addSet = () =>
    void run(() =>
      sets.length > 0
        ? trainingSessionRepository.repeatLastSet(movement.exerciseMovementId)
        : trainingSessionRepository.addSets(movement.exerciseMovementId, [{}]),
    );

  const removeMovement = async () => {
    setIsMenuOpen(false);
    const accepted = await confirm({
      title: `¿Quitar ${exercise.name}?`,
      description: "Se eliminarán también sus series de esta sesión.",
      confirmLabel: "Quitar ejercicio",
      tone: "danger",
    });
    if (accepted)
      await run(() =>
        trainingSessionRepository.removeMovement(movement.exerciseMovementId),
      );
  };

  return (
    <article className={styles.exercise}>
      <header className={styles.exerciseHead}>
        <div className={styles.exerciseTitle}>
          <h3>{exercise.name}</h3>
          {previousSummary && previous ? (
            <p className={styles.previous}>
              La última vez <b>{previousSummary}</b>, el{" "}
              {formatShortDate(previous.session.sessionDate)}
            </p>
          ) : null}
          {movement.prescription ? (
            <p className={styles.previous}>{movement.prescription}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={`Opciones de ${exercise.name}`}
          onClick={() => setIsMenuOpen(true)}
        >
          <Ellipsis aria-hidden="true" />
        </button>
      </header>

      {sets.length > 0 ? (
        <SetList sets={sets} metrics={exercise.metrics} />
      ) : null}

      <button type="button" className="button quiet full" onClick={addSet}>
        <Plus aria-hidden="true" size={20} />
        Añadir serie
      </button>

      {movement.notes ? <p className={styles.note}>{movement.notes}</p> : null}

      <Sheet
        open={isMenuOpen}
        title={exercise.name}
        onClose={() => setIsMenuOpen(false)}
      >
        <label className="field">
          <span>Objetivo</span>
          <input
            defaultValue={movement.prescription}
            placeholder="5 × 3 al 80 %"
            onBlur={(event) =>
              void run(() =>
                trainingSessionRepository.updateMovement(
                  movement.exerciseMovementId,
                  { prescription: event.target.value.trim() },
                ),
              )
            }
          />
        </label>
        <label className="field">
          <span>Notas</span>
          <textarea
            rows={3}
            defaultValue={movement.notes}
            placeholder="Técnica, material, sensaciones…"
            onBlur={(event) =>
              void run(() =>
                trainingSessionRepository.updateMovement(
                  movement.exerciseMovementId,
                  { notes: event.target.value.trim() },
                ),
              )
            }
          />
        </label>
        <div className={styles.menuActions}>
          <Link
            className="button"
            href={`/exercise?exerciseDefinitionId=${exercise.exerciseDefinitionId}`}
          >
            <ChartNoAxesCombined aria-hidden="true" size={20} />
            Ver progreso
          </Link>
          <button
            type="button"
            className="button danger"
            onClick={() => void removeMovement()}
          >
            <Trash2 aria-hidden="true" size={20} />
            Quitar ejercicio
          </button>
        </div>
      </Sheet>
    </article>
  );
}
