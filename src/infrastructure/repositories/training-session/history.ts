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
  listSessionSummaries: () => listSessionSummaries(),

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

export interface TrainingSessionSummary {
  session: TrainingSession;
  blockTitles: string[];
  exerciseNames: string[];
  setCount: number;
  completedSetCount: number;
}

/** Sesiones de la más reciente a la más antigua, con lo necesario para listarlas. */
export async function listSessionSummaries(): Promise<
  TrainingSessionSummary[]
> {
  return database.transaction(
    "r",
    [...sessionTables, database.exerciseDefinitions],
    async () => {
      const [sessions, blocks, movements, setRecords, exercises] =
        await Promise.all([
          database.trainingSessions.toArray(),
          database.trainingBlocks.toArray(),
          database.exerciseMovements.toArray(),
          database.setRecords.toArray(),
          database.exerciseDefinitions.toArray(),
        ]);
      const exerciseNames = new Map(
        exercises.map((exercise) => [
          exercise.exerciseDefinitionId,
          exercise.name,
        ]),
      );
      const blocksBySession = groupBy(
        blocks.toSorted(byPosition),
        (block) => block.trainingSessionId,
      );
      const movementsByBlock = groupBy(
        movements.toSorted(byPosition),
        (movement) => movement.trainingBlockId,
      );
      const setsByMovement = groupBy(
        setRecords,
        (setRecord) => setRecord.exerciseMovementId,
      );
      return sessions
        .map((session) => {
          const sessionBlocks =
            blocksBySession.get(session.trainingSessionId) ?? [];
          const sessionMovements = sessionBlocks.flatMap(
            (block) => movementsByBlock.get(block.trainingBlockId) ?? [],
          );
          const sessionSets = sessionMovements.flatMap(
            (movement) => setsByMovement.get(movement.exerciseMovementId) ?? [],
          );
          return {
            session,
            blockTitles: sessionBlocks.map((block) =>
              block.type === "wod" && block.wodConfiguration?.name
                ? block.wodConfiguration.name
                : block.title,
            ),
            exerciseNames: [
              ...new Set(
                sessionMovements.flatMap((movement) => {
                  const name = exerciseNames.get(movement.exerciseDefinitionId);
                  return name ? [name] : [];
                }),
              ),
            ],
            setCount: sessionSets.length,
            completedSetCount: sessionSets.filter(
              (setRecord) => setRecord.isCompleted,
            ).length,
          };
        })
        .toSorted((left, right) => byNewestEntry(left, right));
    },
  );
}
