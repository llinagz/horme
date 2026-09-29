"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { listExerciseProgress } from "@/application/progress";
import { groupBy } from "@/domain/collections";
import { normalizeWodName as normalizeText } from "@/domain/dates";
import type { Equipment, ExerciseDefinition } from "@/domain/entities";
import {
  equipmentInUse,
  exerciseSearchText,
  secondaryGroupsLabel,
} from "@/domain/exercises";
import { equipmentLabels, muscleGroupLabels, toOptions } from "@/domain/labels";
import { exerciseDefinitionRepository } from "@/infrastructure/repositories/exercise-definition-repository";
import {
  CustomExerciseForm,
  emptyExerciseForm,
} from "@/features/exercises/custom-exercise-form";
import { Sheet } from "@/components/ui/sheet";
import { Segmented } from "@/components/ui/states";
import styles from "./session.module.css";

function ExerciseOption({
  exercise,
  onPick,
}: {
  exercise: ExerciseDefinition;
  onPick: (exercise: ExerciseDefinition) => void;
}) {
  const details = [
    exercise.englishAlias,
    equipmentLabels[exercise.equipment],
    exercise.secondaryMuscleGroups.length > 0
      ? `también ${secondaryGroupsLabel(exercise.secondaryMuscleGroups)}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li>
      <button
        type="button"
        className={styles.pickerOption}
        onClick={() => onPick(exercise)}
      >
        <strong>{exercise.name}</strong>
        <span>{details}</span>
      </button>
    </li>
  );
}

/**
 * Busca por nombre, alias, grupo muscular o material; sin búsqueda, primero los
 * recientes. Si no existe el ejercicio, se puede crear ahí mismo ya clasificado.
 */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  filter,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: ExerciseDefinition) => void;
  /** Limita los ejercicios que se ofrecen; debe ser una función estable. */
  filter?: (exercise: ExerciseDefinition) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState<Equipment | undefined>();
  const [newExerciseName, setNewExerciseName] = useState<string | null>(null);
  const allExercises = useLiveQuery(
    () => exerciseDefinitionRepository.list(),
    [],
  );
  const exercises = useMemo(
    () => (filter ? allExercises?.filter(filter) : allExercises),
    [allExercises, filter],
  );
  const recentIds = useLiveQuery(
    async () =>
      (await listExerciseProgress())
        .slice(0, 6)
        .map((item) => item.exercise.exerciseDefinitionId),
    [],
  );

  const normalizedQuery = normalizeText(query);
  const equipmentOptions = useMemo(
    () =>
      equipmentInUse(exercises ?? []).map((value) => ({
        value,
        label: equipmentLabels[value],
      })),
    [exercises],
  );
  const matches = useMemo(
    () =>
      (exercises ?? []).filter(
        (exercise) =>
          (equipment === undefined || exercise.equipment === equipment) &&
          normalizeText(exerciseSearchText(exercise)).includes(normalizedQuery),
      ),
    [exercises, equipment, normalizedQuery],
  );
  const recent = (recentIds ?? []).flatMap((id) => {
    const exercise = exercises?.find(
      (item) => item.exerciseDefinitionId === id,
    );
    return exercise &&
      (equipment === undefined || exercise.equipment === equipment)
      ? [exercise]
      : [];
  });
  const byMuscleGroup = groupBy(matches, (exercise) => exercise.muscleGroup);

  const pick = (exercise: ExerciseDefinition) => {
    setQuery("");
    setEquipment(undefined);
    setNewExerciseName(null);
    onPick(exercise);
  };

  const close = () => {
    setNewExerciseName(null);
    onClose();
  };

  if (newExerciseName !== null)
    return (
      <Sheet open={open} title="Nuevo ejercicio" onClose={close}>
        <CustomExerciseForm
          initialValues={{
            ...emptyExerciseForm,
            name: newExerciseName,
            equipment: equipment ?? "",
          }}
          submitLabel="Crear y añadir"
          onCancel={() => setNewExerciseName(null)}
          onSubmit={async (exercise) => {
            const id =
              await exerciseDefinitionRepository.createCustom(exercise);
            const created = await exerciseDefinitionRepository.get(id);
            if (created) pick(created);
          }}
        />
      </Sheet>
    );

  return (
    <Sheet open={open} title="Añadir ejercicio" onClose={close}>
      <label className={styles.search}>
        <Search aria-hidden="true" />
        <span className="sr-only">Buscar ejercicio</span>
        <input
          type="search"
          value={query}
          placeholder="Buscar: press, remo, hombro…"
          enterKeyHint="search"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {equipmentOptions.length > 0 ? (
        <Segmented
          label="Filtrar por material"
          options={equipmentOptions}
          value={equipment}
          onChange={setEquipment}
          allowClear
        />
      ) : null}
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
        <div className={styles.pickerEmpty}>
          <p className="muted">Ningún ejercicio coincide.</p>
          <button
            type="button"
            className="button"
            onClick={() => setNewExerciseName(query.trim())}
          >
            <Plus aria-hidden="true" size={20} />
            {query.trim() ? `Crear «${query.trim()}»` : "Crear ejercicio"}
          </button>
        </div>
      ) : null}
      {toOptions(muscleGroupLabels).map(({ value: group, label }) => {
        const items = byMuscleGroup.get(group);
        if (!items) return null;
        return (
          <section key={group} className={styles.pickerGroup}>
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
