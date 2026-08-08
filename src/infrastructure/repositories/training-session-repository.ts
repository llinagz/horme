import type {
  ExerciseDefinition,
  ExerciseMovement,
  SetRecord,
  TrainingBlock,
  TrainingBlockType,
  TrainingSession,
  TrainingSessionAggregate,
  WodConfiguration,
} from "@/domain/entities";
import { getTodayLocalDate } from "@/domain/dates";
import { createUuid } from "@/domain/ids";
import { database, initializeDatabase } from "../database";

const sessionTables = [
  database.trainingSessions,
  database.trainingBlocks,
  database.exerciseMovements,
  database.setRecords,
];

function copyWodStructure(
  wodConfiguration: WodConfiguration | undefined,
): WodConfiguration | undefined {
  if (!wodConfiguration) return undefined;
  return {
    format: wodConfiguration.format,
    scaling: wodConfiguration.scaling,
    ...(wodConfiguration.name !== undefined
      ? { name: wodConfiguration.name }
      : {}),
    ...(wodConfiguration.prescription !== undefined
      ? { prescription: wodConfiguration.prescription }
      : {}),
    ...(wodConfiguration.durationSeconds !== undefined
      ? { durationSeconds: wodConfiguration.durationSeconds }
      : {}),
    ...(wodConfiguration.timeCapSeconds !== undefined
      ? { timeCapSeconds: wodConfiguration.timeCapSeconds }
      : {}),
    ...(wodConfiguration.plannedRounds !== undefined
      ? { plannedRounds: wodConfiguration.plannedRounds }
      : {}),
    ...(wodConfiguration.intervalSeconds !== undefined
      ? { intervalSeconds: wodConfiguration.intervalSeconds }
      : {}),
    ...(wodConfiguration.notes !== undefined
      ? { notes: wodConfiguration.notes }
      : {}),
  };
}

async function copyBlockContents(
  sourceBlock: TrainingBlock,
  targetBlock: TrainingBlock,
): Promise<void> {
  const timestamp = targetBlock.createdAt;
  const movements = await database.exerciseMovements
    .where("trainingBlockId")
    .equals(sourceBlock.trainingBlockId)
    .sortBy("position");
  for (const movement of movements) {
    const exerciseMovementId = createUuid();
    await database.exerciseMovements.add({
      ...movement,
      exerciseMovementId,
      trainingBlockId: targetBlock.trainingBlockId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const setRecords = await database.setRecords
      .where("exerciseMovementId")
      .equals(movement.exerciseMovementId)
      .sortBy("position");
    if (setRecords.length > 0) {
      await database.setRecords.bulkAdd(
        setRecords.map((setRecord) => ({
          ...setRecord,
          setRecordId: createUuid(),
          exerciseMovementId,
          isCompleted: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
      );
    }
  }
}

export interface ExerciseHistoryEntry {
  session: TrainingSession;
  block: TrainingBlock;
  movement: ExerciseMovement;
  sets: SetRecord[];
}

export interface WodHistoryEntry {
  session: TrainingSession;
  block: TrainingBlock;
}

export const trainingSessionRepository = {
  async create(sessionDate = getTodayLocalDate()): Promise<string> {
    await initializeDatabase();
    const timestamp = new Date().toISOString();
    const trainingSessionId = createUuid();
    await database.trainingSessions.add({
      trainingSessionId,
      sessionDate,
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return trainingSessionId;
  },

  async get(
    trainingSessionId: string,
  ): Promise<TrainingSessionAggregate | undefined> {
    await initializeDatabase();
    return database.transaction(
      "r",
      [
        database.trainingSessions,
        database.trainingBlocks,
        database.exerciseMovements,
        database.setRecords,
        database.exerciseDefinitions,
      ],
      async () => {
        const session = await database.trainingSessions.get(trainingSessionId);
        if (!session) return undefined;
        const blocks = await database.trainingBlocks
          .where("trainingSessionId")
          .equals(trainingSessionId)
          .sortBy("position");
        const aggregateBlocks: TrainingSessionAggregate["blocks"] = [];
        for (const block of blocks) {
          const movements = await database.exerciseMovements
            .where("trainingBlockId")
            .equals(block.trainingBlockId)
            .sortBy("position");
          const aggregateMovements: TrainingSessionAggregate["blocks"][number]["movements"] =
            [];
          for (const movement of movements) {
            const exercise = await database.exerciseDefinitions.get(
              movement.exerciseDefinitionId,
            );
            if (!exercise) continue;
            aggregateMovements.push({
              movement,
              exercise,
              sets: await database.setRecords
                .where("exerciseMovementId")
                .equals(movement.exerciseMovementId)
                .sortBy("position"),
            });
          }
          aggregateBlocks.push({ block, movements: aggregateMovements });
        }
        return { session, blocks: aggregateBlocks };
      },
    );
  },

  async list(): Promise<TrainingSession[]> {
    await initializeDatabase();
    return (await database.trainingSessions.toArray()).toSorted(
      (left, right) =>
        right.sessionDate.localeCompare(left.sessionDate) ||
        right.updatedAt.localeCompare(left.updatedAt),
    );
  },

  async listRecent(limit = 4): Promise<TrainingSession[]> {
    return (await this.list()).slice(0, limit);
  },

  async update(
    trainingSessionId: string,
    changes: Partial<
      Pick<
        TrainingSession,
        "sessionDate" | "perceivedExertion" | "painLevel" | "feelings"
      >
    >,
  ): Promise<void> {
    await initializeDatabase();
    const updated = await database.trainingSessions.update(trainingSessionId, {
      ...changes,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) throw new Error("La sesión ya no existe");
  },

  async complete(trainingSessionId: string): Promise<void> {
    await initializeDatabase();
    const timestamp = new Date().toISOString();
    const updated = await database.trainingSessions.update(trainingSessionId, {
      status: "completed",
      completedAt: timestamp,
      updatedAt: timestamp,
    });
    if (!updated) throw new Error("La sesión ya no existe");
  },

  async reopen(trainingSessionId: string): Promise<void> {
    await initializeDatabase();
    const updated = await database.trainingSessions
      .where("trainingSessionId")
      .equals(trainingSessionId)
      .modify((session) => {
        session.status = "draft";
        delete session.completedAt;
        session.updatedAt = new Date().toISOString();
      });
    if (updated === 0) throw new Error("La sesión ya no existe");
  },

  async addBlock(
    trainingSessionId: string,
    type: TrainingBlockType,
  ): Promise<string> {
    await initializeDatabase();
    const timestamp = new Date().toISOString();
    const position = await database.trainingBlocks
      .where("trainingSessionId")
      .equals(trainingSessionId)
      .count();
    const trainingBlockId = createUuid();
    const defaultTitles: Record<TrainingBlockType, string> = {
      strength: "Fuerza",
      technique: "Técnica",
      accessory: "Accesorios",
      wod: "WOD",
      free: "Bloque libre",
    };
    await database.transaction(
      "rw",
      [database.trainingBlocks, database.trainingSessions],
      async () => {
        await database.trainingBlocks.add({
          trainingBlockId,
          trainingSessionId,
          type,
          title: defaultTitles[type],
          position,
          ...(type === "wod"
            ? {
                wodConfiguration: {
                  format: "for-time",
                  scaling: "rx" as const,
                },
              }
            : {}),
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        await database.trainingSessions.update(trainingSessionId, {
          updatedAt: timestamp,
        });
      },
    );
    return trainingBlockId;
  },

  async updateBlock(
    trainingBlockId: string,
    changes: Partial<
      Pick<TrainingBlock, "title" | "notes" | "wodConfiguration">
    >,
  ): Promise<void> {
    await initializeDatabase();
    const updated = await database.trainingBlocks.update(trainingBlockId, {
      ...changes,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) throw new Error("El bloque ya no existe");
  },

  async moveBlock(trainingBlockId: string, direction: -1 | 1): Promise<void> {
    await initializeDatabase();
    const source = await database.trainingBlocks.get(trainingBlockId);
    if (!source) throw new Error("El bloque ya no existe");
    const blocks = await database.trainingBlocks
      .where("trainingSessionId")
      .equals(source.trainingSessionId)
      .sortBy("position");
    const sourceIndex = blocks.findIndex(
      (block) => block.trainingBlockId === trainingBlockId,
    );
    const target = blocks[sourceIndex + direction];
    if (!target) return;
    const timestamp = new Date().toISOString();
    await database.transaction("rw", database.trainingBlocks, async () => {
      await database.trainingBlocks.update(source.trainingBlockId, {
        position: target.position,
        updatedAt: timestamp,
      });
      await database.trainingBlocks.update(target.trainingBlockId, {
        position: source.position,
        updatedAt: timestamp,
      });
    });
  },

  async duplicateBlock(trainingBlockId: string): Promise<string> {
    await initializeDatabase();
    const source = await database.trainingBlocks.get(trainingBlockId);
    if (!source) throw new Error("El bloque ya no existe");
    const timestamp = new Date().toISOString();
    const copiedWodConfiguration = copyWodStructure(source.wodConfiguration);
    const target: TrainingBlock = {
      ...source,
      trainingBlockId: createUuid(),
      position: source.position + 1,
      ...(copiedWodConfiguration
        ? { wodConfiguration: copiedWodConfiguration }
        : {}),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await database.transaction("rw", sessionTables, async () => {
      await database.trainingBlocks
        .where("trainingSessionId")
        .equals(source.trainingSessionId)
        .and((block) => block.position > source.position)
        .modify((block) => {
          block.position += 1;
        });
      await database.trainingBlocks.add(target);
      await copyBlockContents(source, target);
      await database.trainingSessions.update(source.trainingSessionId, {
        updatedAt: timestamp,
      });
    });
    return target.trainingBlockId;
  },

  async removeBlock(trainingBlockId: string): Promise<void> {
    await initializeDatabase();
    const source = await database.trainingBlocks.get(trainingBlockId);
    if (!source) throw new Error("El bloque ya no existe");
    const timestamp = new Date().toISOString();
    await database.transaction("rw", sessionTables, async () => {
      const movements = await database.exerciseMovements
        .where("trainingBlockId")
        .equals(trainingBlockId)
        .toArray();
      for (const movement of movements) {
        await database.setRecords
          .where("exerciseMovementId")
          .equals(movement.exerciseMovementId)
          .delete();
      }
      await database.exerciseMovements.bulkDelete(
        movements.map((movement) => movement.exerciseMovementId),
      );
      await database.trainingBlocks.delete(trainingBlockId);
      await database.trainingBlocks
        .where("trainingSessionId")
        .equals(source.trainingSessionId)
        .and((block) => block.position > source.position)
        .modify((block) => {
          block.position -= 1;
          block.updatedAt = timestamp;
        });
      await database.trainingSessions.update(source.trainingSessionId, {
        updatedAt: timestamp,
      });
    });
  },

  async duplicateSession(trainingSessionId: string): Promise<string> {
    await initializeDatabase();
    const source = await database.trainingSessions.get(trainingSessionId);
    if (!source) throw new Error("La sesión ya no existe");
    const timestamp = new Date().toISOString();
    const targetSessionId = createUuid();
    await database.transaction("rw", sessionTables, async () => {
      await database.trainingSessions.add({
        trainingSessionId: targetSessionId,
        sessionDate: getTodayLocalDate(),
        status: "draft",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      const blocks = await database.trainingBlocks
        .where("trainingSessionId")
        .equals(trainingSessionId)
        .sortBy("position");
      for (const block of blocks) {
        const copiedWodConfiguration = copyWodStructure(block.wodConfiguration);
        const targetBlock: TrainingBlock = {
          ...block,
          trainingBlockId: createUuid(),
          trainingSessionId: targetSessionId,
          ...(copiedWodConfiguration
            ? { wodConfiguration: copiedWodConfiguration }
            : {}),
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        await database.trainingBlocks.add(targetBlock);
        await copyBlockContents(block, targetBlock);
      }
    });
    return targetSessionId;
  },

  async addMovement(
    trainingBlockId: string,
    exerciseDefinitionId: string,
  ): Promise<string> {
    await initializeDatabase();
    const timestamp = new Date().toISOString();
    const position = await database.exerciseMovements
      .where("trainingBlockId")
      .equals(trainingBlockId)
      .count();
    const exerciseMovementId = createUuid();
    await database.exerciseMovements.add({
      exerciseMovementId,
      trainingBlockId,
      exerciseDefinitionId,
      position,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return exerciseMovementId;
  },

  async updateMovement(
    exerciseMovementId: string,
    changes: Partial<Pick<ExerciseMovement, "prescription" | "notes">>,
  ): Promise<void> {
    await initializeDatabase();
    const updated = await database.exerciseMovements.update(
      exerciseMovementId,
      {
        ...changes,
        updatedAt: new Date().toISOString(),
      },
    );
    if (!updated) throw new Error("El ejercicio ya no existe en la sesión");
  },

  async addRepeatedSets(
    exerciseMovementId: string,
    count: number,
    values: Partial<
      Pick<
        SetRecord,
        | "repetitions"
        | "weightKilograms"
        | "durationSeconds"
        | "distanceMeters"
        | "calories"
      >
    >,
  ): Promise<void> {
    await initializeDatabase();
    if (!Number.isInteger(count) || count < 1 || count > 20)
      throw new Error("El número de series debe estar entre 1 y 20");
    const existingCount = await database.setRecords
      .where("exerciseMovementId")
      .equals(exerciseMovementId)
      .count();
    const timestamp = new Date().toISOString();
    await database.setRecords.bulkAdd(
      Array.from({ length: count }, (_, index) => ({
        setRecordId: createUuid(),
        exerciseMovementId,
        position: existingCount + index,
        ...values,
        isCompleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    );
  },

  async repeatLastSet(exerciseMovementId: string): Promise<void> {
    await initializeDatabase();
    const sets = await database.setRecords
      .where("exerciseMovementId")
      .equals(exerciseMovementId)
      .sortBy("position");
    const last = sets.at(-1);
    if (!last) throw new Error("Todavía no hay una serie que repetir");
    const timestamp = new Date().toISOString();
    await database.setRecords.add({
      ...last,
      setRecordId: createUuid(),
      position: last.position + 1,
      isCompleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },

  async removeSet(setRecordId: string): Promise<void> {
    await initializeDatabase();
    const source = await database.setRecords.get(setRecordId);
    if (!source) throw new Error("La serie ya no existe");
    const movement = await database.exerciseMovements.get(
      source.exerciseMovementId,
    );
    if (!movement) throw new Error("El ejercicio ya no existe en la sesión");
    const block = await database.trainingBlocks.get(movement.trainingBlockId);
    if (!block) throw new Error("El bloque ya no existe");

    const timestamp = new Date().toISOString();
    await database.transaction("rw", sessionTables, async () => {
      await database.setRecords.delete(setRecordId);
      await database.setRecords
        .where("exerciseMovementId")
        .equals(source.exerciseMovementId)
        .and((setRecord) => setRecord.position > source.position)
        .modify((setRecord) => {
          setRecord.position -= 1;
          setRecord.updatedAt = timestamp;
        });
      await database.trainingSessions.update(block.trainingSessionId, {
        updatedAt: timestamp,
      });
    });
  },

  async updateSet(
    setRecordId: string,
    changes: Partial<
      Pick<
        SetRecord,
        | "repetitions"
        | "weightKilograms"
        | "durationSeconds"
        | "distanceMeters"
        | "calories"
        | "isCompleted"
      >
    >,
  ): Promise<void> {
    await initializeDatabase();
    const updated = await database.setRecords.update(setRecordId, {
      ...changes,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) throw new Error("La serie ya no existe");
  },

  async updateSetMetric(
    setRecordId: string,
    metric:
      | "repetitions"
      | "weightKilograms"
      | "durationSeconds"
      | "distanceMeters"
      | "calories",
    value: number | undefined,
  ): Promise<void> {
    await initializeDatabase();
    const updated = await database.setRecords
      .where("setRecordId")
      .equals(setRecordId)
      .modify((setRecord) => {
        setRecord.updatedAt = new Date().toISOString();
        if (value === undefined) delete setRecord[metric];
        else setRecord[metric] = value;
      });
    if (updated === 0) throw new Error("La serie ya no existe");
  },

  async getLastExerciseEntry(
    exerciseDefinitionId: string,
    beforeSessionId?: string,
  ): Promise<ExerciseHistoryEntry | undefined> {
    const entries = await this.listExerciseHistory(exerciseDefinitionId);
    return entries.find(
      (entry) => entry.session.trainingSessionId !== beforeSessionId,
    );
  },

  async listExerciseHistory(
    exerciseDefinitionId: string,
  ): Promise<ExerciseHistoryEntry[]> {
    await initializeDatabase();
    const movements = await database.exerciseMovements
      .where("exerciseDefinitionId")
      .equals(exerciseDefinitionId)
      .toArray();
    const entries: ExerciseHistoryEntry[] = [];
    for (const movement of movements) {
      const block = await database.trainingBlocks.get(movement.trainingBlockId);
      if (!block) continue;
      const session = await database.trainingSessions.get(
        block.trainingSessionId,
      );
      if (!session) continue;
      entries.push({
        session,
        block,
        movement,
        sets: await database.setRecords
          .where("exerciseMovementId")
          .equals(movement.exerciseMovementId)
          .sortBy("position"),
      });
    }
    return entries.toSorted((left, right) =>
      right.session.sessionDate.localeCompare(left.session.sessionDate),
    );
  },

  async listExerciseDefinitionsWithHistory(): Promise<ExerciseDefinition[]> {
    await initializeDatabase();
    const movements = await database.exerciseMovements.toArray();
    const definitionIds = new Set(
      movements.map((movement) => movement.exerciseDefinitionId),
    );
    const definitions = await database.exerciseDefinitions.bulkGet([
      ...definitionIds,
    ]);
    return definitions
      .filter(
        (definition): definition is ExerciseDefinition =>
          definition !== undefined,
      )
      .toSorted((left, right) => left.name.localeCompare(right.name, "es"));
  },

  async listWodHistory(): Promise<WodHistoryEntry[]> {
    await initializeDatabase();
    const blocks = await database.trainingBlocks
      .where("type")
      .equals("wod")
      .toArray();
    const entries: WodHistoryEntry[] = [];
    for (const block of blocks) {
      const session = await database.trainingSessions.get(
        block.trainingSessionId,
      );
      if (session && block.wodConfiguration?.name)
        entries.push({ session, block });
    }
    return entries.toSorted((left, right) =>
      right.session.sessionDate.localeCompare(left.session.sessionDate),
    );
  },
};
