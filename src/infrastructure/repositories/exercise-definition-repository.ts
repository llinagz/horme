import type { z } from "zod";
import type { ExerciseDefinition } from "@/domain/entities";
import { createUuid } from "@/domain/ids";
import { categoryForEquipment } from "@/domain/labels";
import {
  customExerciseChangesSchema,
  customExerciseInputSchema,
} from "@/domain/schemas";
import { database, initializeDatabase } from "../database";

export type CustomExerciseInput = z.input<typeof customExerciseInputSchema>;
export type CustomExerciseChanges = z.input<typeof customExerciseChangesSchema>;

export const exerciseDefinitionRepository = {
  async get(
    exerciseDefinitionId: string,
  ): Promise<ExerciseDefinition | undefined> {
    return database.exerciseDefinitions.get(exerciseDefinitionId);
  },

  async list(
    options: { includeArchived?: boolean } = {},
  ): Promise<ExerciseDefinition[]> {
    const definitions = await database.exerciseDefinitions.toArray();
    return definitions
      .filter((definition) => options.includeArchived || !definition.isArchived)
      .toSorted((left, right) => left.name.localeCompare(right.name, "es"));
  },

  async createCustom(input: CustomExerciseInput): Promise<string> {
    await initializeDatabase();
    const parsed = customExerciseInputSchema.parse(input);
    const timestamp = new Date().toISOString();
    const exerciseDefinitionId = createUuid();
    await database.exerciseDefinitions.add({
      exerciseDefinitionId,
      name: parsed.name,
      englishAlias: parsed.englishAlias,
      category: categoryForEquipment(parsed.equipment),
      muscleGroup: parsed.muscleGroup,
      secondaryMuscleGroups: parsed.secondaryMuscleGroups,
      equipment: parsed.equipment,
      metrics: [...new Set(parsed.metrics)],
      origin: "custom",
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return exerciseDefinitionId;
  },

  /** Corrige nombre, alias y clasificación de un ejercicio personalizado. */
  async updateCustom(
    exerciseDefinitionId: string,
    changes: CustomExerciseChanges,
  ): Promise<void> {
    await initializeDatabase();
    const parsed = customExerciseChangesSchema.parse(changes);
    await database.transaction("rw", database.exerciseDefinitions, async () => {
      const definition =
        await database.exerciseDefinitions.get(exerciseDefinitionId);
      if (!definition || definition.origin !== "custom")
        throw new Error("Solo se pueden editar ejercicios personalizados");
      await database.exerciseDefinitions.update(exerciseDefinitionId, {
        ...parsed,
        category: categoryForEquipment(parsed.equipment),
        updatedAt: new Date().toISOString(),
      });
    });
  },

  async setArchived(
    exerciseDefinitionId: string,
    isArchived: boolean,
  ): Promise<void> {
    await initializeDatabase();
    await database.transaction("rw", database.exerciseDefinitions, async () => {
      const definition =
        await database.exerciseDefinitions.get(exerciseDefinitionId);
      if (!definition || definition.origin !== "custom")
        throw new Error("Solo se pueden archivar ejercicios personalizados");
      await database.exerciseDefinitions.update(exerciseDefinitionId, {
        isArchived,
        updatedAt: new Date().toISOString(),
      });
    });
  },
};
