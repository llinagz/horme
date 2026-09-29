import type { Equipment, ExerciseDefinition, MuscleGroup } from "./entities";
import { equipmentLabels, muscleGroupLabels } from "./labels";

/** «Cuádriceps · Mancuerna», la clasificación tal y como se lee en pantalla. */
export function classificationLabel(
  exercise: Pick<ExerciseDefinition, "muscleGroup" | "equipment">,
): string {
  return `${muscleGroupLabels[exercise.muscleGroup]} · ${equipmentLabels[exercise.equipment]}`;
}

/** Etiquetas de los grupos secundarios, por ejemplo «Glúteos, Isquios». */
export function secondaryGroupsLabel(
  secondaryMuscleGroups: MuscleGroup[],
): string {
  return secondaryMuscleGroups
    .map((group) => muscleGroupLabels[group])
    .join(", ");
}

/**
 * Todo lo que el buscador puede encontrar de un ejercicio: nombre, alias,
 * grupo principal, grupos secundarios y material.
 */
export function exerciseSearchText(exercise: ExerciseDefinition): string {
  return [
    exercise.name,
    exercise.englishAlias,
    muscleGroupLabels[exercise.muscleGroup],
    ...exercise.secondaryMuscleGroups.map((group) => muscleGroupLabels[group]),
    equipmentLabels[exercise.equipment],
  ].join(" ");
}

/** Materiales que aparecen en algún ejercicio, en el orden de las etiquetas. */
export function equipmentInUse(exercises: ExerciseDefinition[]): Equipment[] {
  const used = new Set(exercises.map((exercise) => exercise.equipment));
  return (Object.keys(equipmentLabels) as Equipment[]).filter((equipment) =>
    used.has(equipment),
  );
}
