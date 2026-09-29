"use client";

import { useState, type FormEvent } from "react";
import type { Equipment, ExerciseMetric, MuscleGroup } from "@/domain/entities";
import { getErrorMessage } from "@/domain/errors";
import {
  equipmentLabels,
  exerciseMetricLabels,
  muscleGroupLabels,
  toOptions,
} from "@/domain/labels";
import { InlineMessage, ToggleGroup } from "@/components/ui/states";
import styles from "./custom-exercise-form.module.css";

export interface ExerciseFormValues {
  name: string;
  englishAlias: string;
  /** Vacío hasta que se elige: no se adivina la clasificación. */
  muscleGroup: MuscleGroup | "";
  secondaryMuscleGroups: MuscleGroup[];
  equipment: Equipment | "";
  metrics: ExerciseMetric[];
}

export interface ClassifiedExercise {
  name: string;
  englishAlias: string;
  muscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  equipment: Equipment;
  metrics: ExerciseMetric[];
}

export const emptyExerciseForm: ExerciseFormValues = {
  name: "",
  englishAlias: "",
  muscleGroup: "",
  secondaryMuscleGroups: [],
  equipment: "",
  metrics: ["repetitions", "weightKilograms"],
};

const muscleGroupOptions = toOptions(muscleGroupLabels);
const equipmentOptions = toOptions(equipmentLabels);
const metricOptions = (
  Object.keys(exerciseMetricLabels) as ExerciseMetric[]
).map((metric) => ({
  value: metric,
  label: exerciseMetricLabels[metric].label,
}));

/**
 * Alta y edición de ejercicios propios, con su grupo muscular principal,
 * los secundarios y el material. Al editar no se tocan las métricas, porque
 * cambiarlas dejaría huérfanos los valores de las series ya guardadas.
 */
export function CustomExerciseForm({
  initialValues = emptyExerciseForm,
  canEditMetrics = true,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValues?: ExerciseFormValues;
  canEditMetrics?: boolean;
  submitLabel: string;
  onSubmit: (exercise: ClassifiedExercise) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const update = (changes: Partial<ExerciseFormValues>) =>
    setValues((current) => ({ ...current, ...changes }));

  const changeMainGroup = (muscleGroup: MuscleGroup) =>
    setValues((current) => ({
      ...current,
      muscleGroup,
      secondaryMuscleGroups: current.secondaryMuscleGroups.filter(
        (group) => group !== muscleGroup,
      ),
    }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving || !values.muscleGroup || !values.equipment) return;
    setIsSaving(true);
    setError("");
    try {
      await onSubmit({
        name: values.name,
        englishAlias: values.englishAlias,
        muscleGroup: values.muscleGroup,
        secondaryMuscleGroups: values.secondaryMuscleGroups,
        equipment: values.equipment,
        metrics: values.metrics,
      });
      setValues(initialValues);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="stack" onSubmit={(event) => void submit(event)}>
      <div className="field-row">
        <label className="field">
          <span>Nombre</span>
          <input
            name="name"
            required
            maxLength={60}
            value={values.name}
            onChange={(event) => update({ name: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Nombre en inglés</span>
          <input
            name="englishAlias"
            maxLength={60}
            placeholder="Opcional"
            value={values.englishAlias}
            onChange={(event) => update({ englishAlias: event.target.value })}
          />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span>Grupo muscular principal</span>
          <select
            name="muscleGroup"
            required
            value={values.muscleGroup}
            onChange={(event) =>
              changeMainGroup(event.target.value as MuscleGroup)
            }
          >
            <option value="" disabled>
              Elige un grupo
            </option>
            {muscleGroupOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Material</span>
          <select
            name="equipment"
            required
            value={values.equipment}
            onChange={(event) =>
              update({ equipment: event.target.value as Equipment })
            }
          >
            <option value="" disabled>
              Elige el material
            </option>
            {equipmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="field">
        <span className="field-label">También trabaja (opcional)</span>
        <ToggleGroup
          label="Grupos musculares secundarios"
          options={muscleGroupOptions.map((option) => ({
            ...option,
            disabled: option.value === values.muscleGroup,
          }))}
          values={values.secondaryMuscleGroups}
          onChange={(secondaryMuscleGroups) =>
            update({ secondaryMuscleGroups })
          }
        />
      </div>
      {canEditMetrics ? (
        <fieldset className={styles.metrics}>
          <legend className="field-label">Qué vas a apuntar</legend>
          {metricOptions.map((option) => (
            <label className="toggle" key={option.value}>
              <input
                type="checkbox"
                checked={values.metrics.includes(option.value)}
                onChange={(event) =>
                  update({
                    metrics: event.target.checked
                      ? [...values.metrics, option.value]
                      : values.metrics.filter((item) => item !== option.value),
                  })
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
      <div className={styles.actions}>
        {onCancel ? (
          <button type="button" className="button" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
        <button type="submit" className="button primary" disabled={isSaving}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
