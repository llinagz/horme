import { byPosition, groupBy } from "@/domain/collections";
import type {
  ExerciseDefinition,
  ExerciseMovement,
  SetRecord,
  TrainingBlock,
  TrainingSession,
} from "@/domain/entities";
import { database } from "../../database";
import { sessionTables, whereAnyOf } from "./shared";

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

function byNewestEntry(
  left: { session: TrainingSession },
  right: { session: TrainingSession },
): number {
  return (
    right.session.sessionDate.localeCompare(left.session.sessionDate) ||
    right.session.updatedAt.localeCompare(left.session.updatedAt)
  );
}

function indexBy<T, K>(items: Array<T | undefined>, getKey: (item: T) => K) {
  return new Map(
    items.flatMap((item) => (item === undefined ? [] : [[getKey(item), item]])),
  );
}

/** Une cada movimiento con su bloque, su sesión y sus series ordenadas. */
function assembleHistoryEntries(
  movements: ExerciseMovement[],
  blocks: Array<TrainingBlock | undefined>,
  sessions: Array<TrainingSession | undefined>,
  setRecords: SetRecord[],
): ExerciseHistoryEntry[] {
  const blocksById = indexBy(blocks, (block) => block.trainingBlockId);
  const sessionsById = indexBy(
    sessions,
    (session) => session.trainingSessionId,
  );
  const setsByMovement = groupBy(
    setRecords.toSorted(byPosition),
    (setRecord) => setRecord.exerciseMovementId,
  );
  return movements
    .flatMap((movement) => {
      const block = blocksById.get(movement.trainingBlockId);
      const session = block && sessionsById.get(block.trainingSessionId);
      if (!block || !session) return [];
      return [
        {
          session,
          block,
          movement,
          sets: setsByMovement.get(movement.exerciseMovementId) ?? [],
        },
      ];
    })
    .toSorted(byNewestEntry);
}

export const historyOperations = {
  /** Apariciones de un ejercicio, de la más reciente a la más antigua. */
  async listExerciseHistory(
    exerciseDefinitionId: string,
  ): Promise<ExerciseHistoryEntry[]> {
    return database.transaction("r", sessionTables, async () => {
      const movements = await database.exerciseMovements
        .where("exerciseDefinitionId")
        .equals(exerciseDefinitionId)
        .toArray();
      const blocks = await database.trainingBlocks.bulkGet([
        ...new Set(movements.map((movement) => movement.trainingBlockId)),
      ]);
      const sessions = await database.trainingSessions.bulkGet([
        ...new Set(
          blocks.flatMap((block) => (block ? [block.trainingSessionId] : [])),
        ),
      ]);
      const setRecords = await whereAnyOf(
        database.setRecords,
        "exerciseMovementId",
        movements.map((movement) => movement.exerciseMovementId),
      );
      return assembleHistoryEntries(movements, blocks, sessions, setRecords);
    });
  },

  /** Historial de todos los ejercicios usados, agrupado por ejercicio. */
  async listAllExerciseHistories(): Promise<
    Map<string, ExerciseHistoryEntry[]>
  > {
    // Se necesita todo el historial: leer cada tabla una vez es lo más rápido.
    return database.transaction("r", sessionTables, async () => {
      const entries = assembleHistoryEntries(
        await database.exerciseMovements.toArray(),
        await database.trainingBlocks.toArray(),
        await database.trainingSessions.toArray(),
        await database.setRecords.toArray(),
      );
      return groupBy(entries, (entry) => entry.movement.exerciseDefinitionId);
    });
  },

  /** Última vez que se hizo el ejercicio fuera de la sesión indicada. */
  async getLastExerciseEntry(
    exerciseDefinitionId: string,
    excludedSessionId?: string,
  ): Promise<ExerciseHistoryEntry | undefined> {
    const entries =
      await historyOperations.listExerciseHistory(exerciseDefinitionId);
    return entries.find(
      (entry) => entry.session.trainingSessionId !== excludedSessionId,
    );
  },

  async listExerciseDefinitionsWithHistory(): Promise<ExerciseDefinition[]> {
    const definitionIds = await database.exerciseMovements
      .orderBy("exerciseDefinitionId")
      .uniqueKeys();
    const definitions = await database.exerciseDefinitions.bulkGet(
      definitionIds as string[],
    );
    return definitions
      .filter(
        (definition): definition is ExerciseDefinition =>
          definition !== undefined,
      )
      .toSorted((left, right) => left.name.localeCompare(right.name, "es"));
  },

  /** WOD con nombre, para comparar resultados entre sesiones. */
  async listWodHistory(): Promise<WodHistoryEntry[]> {
    return database.transaction("r", sessionTables, async () => {
      const blocks = (
        await database.trainingBlocks.where("type").equals("wod").toArray()
      ).filter((block) => block.wodConfiguration?.name);
      const sessions = await database.trainingSessions.bulkGet([
        ...new Set(blocks.map((block) => block.trainingSessionId)),
      ]);
      const sessionsById = new Map(
        sessions.flatMap((session) =>
          session ? [[session.trainingSessionId, session]] : [],
        ),
      );
      return blocks
        .flatMap((block) => {
          const session = sessionsById.get(block.trainingSessionId);
          return session ? [{ session, block }] : [];
        })
        .toSorted(byNewestEntry);
    });
  },
};
