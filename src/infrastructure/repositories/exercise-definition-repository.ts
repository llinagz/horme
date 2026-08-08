import type {
  ExerciseCategory,
  ExerciseDefinition,
  ExerciseMetric,
} from "@/domain/entities";
import { createUuid } from "@/domain/ids";
import { database, initializeDatabase } from "../database";

export const exerciseDefinitionRepository = {
  async list(
    options: { includeArchived?: boolean } = {},
  ): Promise<ExerciseDefinition[]> {
    await initializeDatabase();
    const definitions = await database.exerciseDefinitions.toArray();
    return definitions
      .filter((definition) => options.includeArchived || !definition.isArchived)
      .toSorted((left, right) => left.name.localeCompare(right.name, "es"));
  },

  async createCustom(input: {
    name: string;
    englishAlias: string;
    category: ExerciseCategory;
    metrics: ExerciseMetric[];
  }): Promise<string> {
    await initializeDatabase();
    const name = input.name.trim();
    if (!name) throw new Error("El ejercicio necesita un nombre");
    if (input.metrics.length === 0)
      throw new Error("Selecciona al menos una métrica");
    const timestamp = new Date().toISOString();
    const exerciseDefinitionId = createUuid();
    await database.exerciseDefinitions.add({
      exerciseDefinitionId,
      name,
      englishAlias: input.englishAlias.trim(),
      category: input.category,
      metrics: [...new Set(input.metrics)],
      origin: "custom",
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return exerciseDefinitionId;
  },

  async setArchived(
    exerciseDefinitionId: string,
    isArchived: boolean,
  ): Promise<void> {
    await initializeDatabase();
    const definition =
      await database.exerciseDefinitions.get(exerciseDefinitionId);
    if (!definition || definition.origin !== "custom")
      throw new Error("Solo se pueden archivar ejercicios personalizados");
    await database.exerciseDefinitions.update(exerciseDefinitionId, {
      isArchived,
      updatedAt: new Date().toISOString(),
    });
  },
};
