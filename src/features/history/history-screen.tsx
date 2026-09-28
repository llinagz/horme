"use client";

import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Copy, Ellipsis, Trash2 } from "lucide-react";
import { useState } from "react";
import { groupBy } from "@/domain/collections";
import { formatSessionTitle, pluralize } from "@/domain/format";
import {
  trainingSessionRepository,
  type TrainingSessionSummary,
} from "@/infrastructure/repositories/training-session-repository";
import { Sheet, useConfirm } from "@/components/ui/sheet";
import { EmptyState, LoadingState, PageHeader } from "@/components/ui/states";
import { useAction } from "@/components/ui/toast";
import { SessionRow } from "./session-row";
import styles from "./history.module.css";

const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function monthOf(localDate: string): string {
  const label = monthFormatter.format(new Date(`${localDate}T00:00:00Z`));
  return label.charAt(0).toLocaleUpperCase("es-ES") + label.slice(1);
}

export function HistoryScreen() {
  const router = useRouter();
  const run = useAction();
  const confirm = useConfirm();
  const summaries = useLiveQuery(() =>
    trainingSessionRepository.listSessionSummaries(),
  );
  const [selected, setSelected] = useState<TrainingSessionSummary | null>(null);

  if (summaries === undefined)
    return <LoadingState label="Cargando el historial…" />;

  const months = groupBy(summaries, (summary) =>
    monthOf(summary.session.sessionDate),
  );

  const duplicate = (summary: TrainingSessionSummary) => {
    setSelected(null);
    void run(async () => {
      const id = await trainingSessionRepository.duplicateSession(
        summary.session.trainingSessionId,
      );
      router.push(`/session?trainingSessionId=${id}`);
    });
  };

  const remove = async (summary: TrainingSessionSummary) => {
    setSelected(null);
    const accepted = await confirm({
      title: `¿Eliminar el entreno del ${formatSessionTitle(summary.session.sessionDate).toLocaleLowerCase("es-ES")}?`,
      description:
        "Se borrarán sus bloques, ejercicios y series. No se puede deshacer.",
      confirmLabel: "Eliminar entreno",
      tone: "danger",
    });
    if (accepted)
      await run(
        () =>
          trainingSessionRepository.remove(summary.session.trainingSessionId),
        { success: "Entreno eliminado" },
      );
  };

  return (
    <div className="stack-large">
      <PageHeader
        title="Historial"
        subtitle={
          summaries.length > 0
            ? pluralize(summaries.length, "sesión", "sesiones")
            : undefined
        }
      />
      {summaries.length === 0 ? (
        <EmptyState
          title="Historial vacío"
          description="Tu primer entreno aparecerá aquí en cuanto lo empieces."
        />
      ) : (
        [...months.entries()].map(([month, items]) => (
          <section key={month} className="section">
            <h2 className={styles.month}>{month}</h2>
            <div className="list">
              {items.map((summary) => (
                <SessionRow
                  key={summary.session.trainingSessionId}
                  summary={summary}
                  action={
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Opciones del entreno del ${formatSessionTitle(summary.session.sessionDate).toLocaleLowerCase("es-ES")}`}
                      onClick={() => setSelected(summary)}
                    >
                      <Ellipsis aria-hidden="true" />
                    </button>
                  }
                />
              ))}
            </div>
          </section>
        ))
      )}

      <Sheet
        open={selected !== null}
        title={selected ? formatSessionTitle(selected.session.sessionDate) : ""}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className={styles.menu}>
            <button
              type="button"
              className="button large"
              onClick={() => duplicate(selected)}
            >
              <Copy aria-hidden="true" size={20} />
              Repetir hoy
            </button>
            <button
              type="button"
              className="button large danger"
              onClick={() => void remove(selected)}
            >
              <Trash2 aria-hidden="true" size={20} />
              Eliminar entreno
            </button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
