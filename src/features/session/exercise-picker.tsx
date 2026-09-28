"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { listExerciseProgress } from "@/application/progress";
import { groupBy } from "@/domain/collections";
import { normalizeWodName as normalizeText } from "@/domain/dates";
import type { ExerciseDefinition } from "@/domain/entities";
import { exerciseCategoryLabels, toOptions } from "@/domain/labels";
import { exerciseDefinitionRepository } from "@/infrastructure/repositories/exercise-definition-repository";
import { Sheet } from "@/components/ui/sheet";
import styles from "./session.module.css";

function ExerciseOption({
  exercise,
  onPick,
}: {
  exercise: ExerciseDefinition;
  onPick: (exercise: ExerciseDefinition) => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={styles.pickerOption}
        onClick={() => onPick(exercise)}
      >
        <strong>{exercise.name}</strong>
        {exercise.englishAlias ? <span>{exercise.englishAlias}</span> : null}
      </button>
    </li>
  );
}

/** Busca por nombre o alias inglés; sin búsqueda, primero los recientes. */
export function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: ExerciseDefinition) => void;
}) {
  const [query, setQuery] = useState("");
  const exercises = useLiveQuery(() => exerciseDefinitionRepository.list(), []);
  const recentIds = useLiveQuery(
    async () =>
      (await listExerciseProgress())
        .slice(0, 6)
        .map((item) => item.exercise.exerciseDefinitionId),
    [],
  );

  const normalizedQuery = normalizeText(query);
  const matches = useMemo(
    () =>
      (exercises ?? []).filter((exercise) =>
        normalizeText(`${exercise.name} ${exercise.englishAlias}`).includes(
          normalizedQuery,
        ),
      ),
    [exercises, normalizedQuery],
  );
  const recent = (recentIds ?? []).flatMap((id) => {
    const exercise = exercises?.find(
      (item) => item.exerciseDefinitionId === id,
    );
    return exercise ? [exercise] : [];
  });
  const byCategory = groupBy(matches, (exercise) => exercise.category);

  const pick = (exercise: ExerciseDefinition) => {
    setQuery("");
    onPick(exercise);
  };

  return (
    <Sheet open={open} title="Añadir ejercicio" onClose={onClose}>
      <label className={styles.search}>
        <Search aria-hidden="true" />
        <span className="sr-only">Buscar ejercicio</span>
        <input
          type="search"
          value={query}
          placeholder="Buscar: sentadilla, snatch…"
          enterKeyHint="search"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {normalizedQuery === "" && recent.length > 0 ? (
        <section className={styles.pickerGroup}>
          <h3>Recientes</h3>
          <ul>
            {recent.map((exercise) => (
              <ExerciseOption
                key={exercise.exerciseDefinitionId}
                exercise={exercise}
                onPick={pick}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {matches.length === 0 && exercises ? (
        <p className="muted">
          Ningún ejercicio coincide. Puedes crearlo en Ajustes.
        </p>
      ) : null}
      {toOptions(exerciseCategoryLabels).map(({ value: category, label }) => {
        const items = byCategory.get(category);
        if (!items) return null;
        return (
          <section key={category} className={styles.pickerGroup}>
            <h3>{label}</h3>
            <ul>
              {items.map((exercise) => (
                <ExerciseOption
                  key={exercise.exerciseDefinitionId}
                  exercise={exercise}
                  onPick={pick}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </Sheet>
  );
}
