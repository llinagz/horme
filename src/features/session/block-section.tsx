"use client";

import { ArrowDown, ArrowUp, Copy, Ellipsis, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { TrainingSessionAggregate } from "@/domain/entities";
import { pluralize } from "@/domain/format";
import { trainingBlockTypeLabels } from "@/domain/labels";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import { Sheet, useConfirm } from "@/components/ui/sheet";
import { useAction } from "@/components/ui/toast";
import { MovementCard } from "./movement-card";
import { WodEditor } from "./wod-editor";
import styles from "./session.module.css";

type BlockEntry = TrainingSessionAggregate["blocks"][number];

export function BlockSection({
  blockEntry,
  trainingSessionId,
  isFirst,
  isLast,
  onAddExercise,
}: {
  blockEntry: BlockEntry;
  trainingSessionId: string;
  isFirst: boolean;
  isLast: boolean;
  onAddExercise: (trainingBlockId: string) => void;
}) {
  const { block, movements } = blockEntry;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const run = useAction();
  const confirm = useConfirm();
  const typeLabel = trainingBlockTypeLabels[block.type];
  const showsType = block.title !== typeLabel && block.type !== "free";

  const act = (write: () => Promise<unknown>, success?: string) => {
    setIsMenuOpen(false);
    void run(write, success ? { success } : {});
  };

  const removeBlock = async () => {
    setIsMenuOpen(false);
    const accepted = await confirm({
      title: `¿Eliminar ${block.title}?`,
      description:
        movements.length > 0
          ? `Se eliminarán ${pluralize(movements.length, "ejercicio")} con sus series.`
          : undefined,
      confirmLabel: "Eliminar bloque",
      tone: "danger",
    });
    if (accepted)
      await run(() =>
        trainingSessionRepository.removeBlock(block.trainingBlockId),
      );
  };

  return (
    <section className={styles.block} aria-label={block.title}>
      <header className={styles.blockHead}>
        <div className={styles.blockTitle}>
          <h2>{block.title}</h2>
          <span>
            {showsType ? `${typeLabel}, ` : ""}
            {block.type === "wod"
              ? ""
              : pluralize(movements.length, "ejercicio")}
          </span>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={`Opciones del bloque ${block.title}`}
          onClick={() => setIsMenuOpen(true)}
        >
          <Ellipsis aria-hidden="true" />
        </button>
      </header>

      {block.notes ? <p className={styles.note}>{block.notes}</p> : null}

      {block.type === "wod" ? (
        <article className={styles.exercise}>
          <WodEditor block={block} />
        </article>
      ) : null}

      {movements.map((movementEntry) => (
        <MovementCard
          key={movementEntry.movement.exerciseMovementId}
          movementEntry={movementEntry}
          trainingSessionId={trainingSessionId}
        />
      ))}

      <button
        type="button"
        className={`button ${styles.addExercise}`}
        onClick={() => onAddExercise(block.trainingBlockId)}
      >
        <Plus aria-hidden="true" size={20} />
        {block.type === "wod" ? "Añadir movimiento" : "Añadir ejercicio"}
      </button>

      <Sheet
        open={isMenuOpen}
        title={block.title}
        onClose={() => setIsMenuOpen(false)}
      >
        <label className="field">
          <span>Nombre del bloque</span>
          <input
            defaultValue={block.title}
            onBlur={(event) => {
              const title = event.target.value.trim();
              if (title && title !== block.title)
                void run(() =>
                  trainingSessionRepository.updateBlock(block.trainingBlockId, {
                    title,
                  }),
                );
            }}
          />
        </label>
        <label className="field">
          <span>Notas</span>
          <textarea
            rows={3}
            defaultValue={block.notes}
            placeholder="Calentamiento, tempo, descansos…"
            onBlur={(event) =>
              void run(() =>
                trainingSessionRepository.updateBlock(block.trainingBlockId, {
                  notes: event.target.value.trim(),
                }),
              )
            }
          />
        </label>
        <div className={styles.menuActions}>
          <button
            type="button"
            className="button"
            disabled={isFirst}
            onClick={() =>
              act(() =>
                trainingSessionRepository.moveBlock(block.trainingBlockId, -1),
              )
            }
          >
            <ArrowUp aria-hidden="true" size={20} />
            Subir
          </button>
          <button
            type="button"
            className="button"
            disabled={isLast}
            onClick={() =>
              act(() =>
                trainingSessionRepository.moveBlock(block.trainingBlockId, 1),
              )
            }
          >
            <ArrowDown aria-hidden="true" size={20} />
            Bajar
          </button>
          <button
            type="button"
            className="button"
            onClick={() =>
              act(
                () =>
                  trainingSessionRepository.duplicateBlock(
                    block.trainingBlockId,
                  ),
                "Bloque duplicado",
              )
            }
          >
            <Copy aria-hidden="true" size={20} />
            Duplicar
          </button>
          <button
            type="button"
            className="button danger"
            onClick={() => void removeBlock()}
          >
            <Trash2 aria-hidden="true" size={20} />
            Eliminar
          </button>
        </div>
      </Sheet>
    </section>
  );
}
