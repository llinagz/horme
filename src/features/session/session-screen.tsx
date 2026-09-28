"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { addExerciseToBlock } from "@/application/add-exercise";
import type { TrainingBlockType } from "@/domain/entities";
import { formatSessionTitle } from "@/domain/format";
import { toOptions, trainingBlockTypeLabels } from "@/domain/labels";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import { Kotinos } from "@/components/ui/kotinos";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useAction, useToast } from "@/components/ui/toast";
import { BlockSection } from "./block-section";
import { ExercisePicker } from "./exercise-picker";
import { Wellbeing } from "./wellbeing";
import styles from "./session.module.css";

const blockTypeOptions = toOptions(trainingBlockTypeLabels);

export function SessionScreen() {
  const router = useRouter();
  const trainingSessionId = useSearchParams().get("trainingSessionId") ?? "";
  const run = useAction();
  const { show } = useToast();
  const aggregate = useLiveQuery(
    async () =>
      trainingSessionId
        ? ((await trainingSessionRepository.get(trainingSessionId)) ?? null)
        : null,
    [trainingSessionId],
  );
  const [pickerBlockId, setPickerBlockId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isBlockSheetOpen, setIsBlockSheetOpen] = useState(false);
  const isBusy = useRef(false);

  if (!trainingSessionId)
    return (
      <EmptyState
        title="Empieza una sesión"
        description="Crea la sesión de hoy y añade bloques a tu ritmo. Se guarda sola."
        action={
          <button
            type="button"
            className="button primary large"
            onClick={() =>
              void run(async () => {
                const id = await trainingSessionRepository.create();
                router.replace(`/session?trainingSessionId=${id}`);
              })
            }
          >
            Empezar sesión
          </button>
        }
      />
    );
  if (aggregate === undefined) return <LoadingState label="Abriendo sesión…" />;
  if (aggregate === null)
    return (
      <EmptyState
        title="Esta sesión ya no existe"
        description="Puede que se eliminara o que se restaurara otra copia en este móvil."
      />
    );

  const { session, blocks } = aggregate;
  const allSets = blocks.flatMap((entry) =>
    entry.movements.flatMap((movementEntry) => movementEntry.sets),
  );
  const completedCount = allSets.filter((item) => item.isCompleted).length;
  const isCompleted = session.status === "completed";

  const openPicker = (trainingBlockId: string | null) => {
    setPickerBlockId(trainingBlockId);
    setIsPickerOpen(true);
  };

  /** Con varios toques seguidos solo se crea un bloque o ejercicio. */
  const guarded = async (write: () => Promise<unknown>) => {
    if (isBusy.current) return;
    isBusy.current = true;
    try {
      await run(write);
    } finally {
      isBusy.current = false;
    }
  };

  const addBlock = (type: TrainingBlockType) => {
    setIsBlockSheetOpen(false);
    void guarded(async () => {
      const blockId = await trainingSessionRepository.addBlock(
        session.trainingSessionId,
        type,
      );
      if (type !== "wod") openPicker(blockId);
    });
  };

  const addExercise = (exerciseDefinitionId: string) => {
    setIsPickerOpen(false);
    void guarded(async () => {
      // Sin bloque elegido va al último de fuerza o accesorios, o a uno nuevo.
      const targetBlockId =
        pickerBlockId ??
        blocks.findLast((entry) => entry.block.type !== "wod")?.block
          .trainingBlockId ??
        (await trainingSessionRepository.addBlock(
          session.trainingSessionId,
          "strength",
        ));
      await addExerciseToBlock(
        targetBlockId,
        exerciseDefinitionId,
        session.trainingSessionId,
      );
    });
  };

  const toggleCompleted = () =>
    void guarded(async () => {
      if (isCompleted) {
        await trainingSessionRepository.reopen(session.trainingSessionId);
        return;
      }
      await trainingSessionRepository.complete(session.trainingSessionId);
      show({
        message: "Sesión finalizada",
        action: {
          label: "Deshacer",
          onAction: () =>
            trainingSessionRepository.reopen(session.trainingSessionId),
        },
      });
    });

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className="page-header-text">
          <Link href="/" className="link back-link">
            <ChevronLeft aria-hidden="true" size={20} />
            Inicio
          </Link>
          <h1 className="title">{formatSessionTitle(session.sessionDate)}</h1>
          <p className="muted">
            {isCompleted ? "Sesión finalizada" : "Borrador, se guarda solo"}
          </p>
        </div>
        <Kotinos total={allSets.length} done={completedCount} />
      </header>

      {blocks.length === 0 ? (
        <div className={styles.startBlocks}>
          <p className="muted">¿Con qué empiezas?</p>
          <div className={styles.blockTypes}>
            {blockTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="button large"
                onClick={() => addBlock(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        blocks.map((blockEntry, index) => (
          <BlockSection
            key={blockEntry.block.trainingBlockId}
            blockEntry={blockEntry}
            trainingSessionId={session.trainingSessionId}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
            onAddExercise={openPicker}
          />
        ))
      )}

      <Wellbeing session={session} />

      <div className={styles.thumbbar} data-thumbbar>
        <button
          type="button"
          className="button large"
          onClick={() => openPicker(null)}
        >
          <Plus aria-hidden="true" size={20} />
          Ejercicio
        </button>
        <button
          type="button"
          className="button large"
          onClick={() => setIsBlockSheetOpen(true)}
        >
          <Plus aria-hidden="true" size={20} />
          Bloque
        </button>
        <button
          type="button"
          className={isCompleted ? "button large" : "button large primary"}
          onClick={toggleCompleted}
        >
          {isCompleted ? (
            <>
              <RotateCcw aria-hidden="true" size={20} />
              Reabrir
            </>
          ) : (
            "Finalizar"
          )}
        </button>
      </div>

      <ExercisePicker
        open={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onPick={(exercise) => addExercise(exercise.exerciseDefinitionId)}
      />
      <Sheet
        open={isBlockSheetOpen}
        title="Añadir bloque"
        onClose={() => setIsBlockSheetOpen(false)}
      >
        <div className={styles.blockTypes}>
          {blockTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="button large"
              onClick={() => addBlock(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
