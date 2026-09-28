import Dexie from "dexie";
import type { z } from "zod";
import { byPosition, groupBy } from "@/domain/collections";
import { getTodayLocalDate } from "@/domain/dates";
import type {
  TrainingSession,
  TrainingSessionAggregate,
} from "@/domain/entities";
import { createUuid } from "@/domain/ids";
import { trainingSessionChangesSchema } from "@/domain/schemas";
import { localDateSchema } from "@/domain/validation";
import { database, initializeDatabase } from "../../database";
import {
  copyBlockInto,
  deleteBlocksCascade,
  now,
  sessionTables,
  toUpdateSpec,
  whereAnyOf,
} from "./shared";

export type TrainingSessionChanges = z.input<
  typeof trainingSessionChangesSchema
>;

function byNewestSession(left: TrainingSession, right: TrainingSession) {
  return (
    right.sessionDate.localeCompare(left.sessionDate) ||
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

export const sessionOperations = {
  async create(sessionDate = getTodayLocalDate()): Promise<string> {
    await initializeDatabase();
    const timestamp = now();
    const trainingSessionId = createUuid();
    await database.trainingSessions.add({
      trainingSessionId,
      sessionDate: localDateSchema.parse(sessionDate),
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return trainingSessionId;
  },

  // Las lecturas no esperan a `initializeDatabase`: una promesa ajena a Dexie
  // dentro de `liveQuery` rompe el seguimiento de cambios. `DatabaseProvider`
  // garantiza que la base ya está lista antes de pintar las pantallas.
  async get(
    trainingSessionId: string,
  ): Promise<TrainingSessionAggregate | undefined> {
    return database.transaction(
      "r",
      [...sessionTables, database.exerciseDefinitions],
      async () => {
        const session = await database.trainingSessions.get(trainingSessionId);
        if (!session) return undefined;
        const blocks = await database.trainingBlocks
          .where("[trainingSessionId+position]")
          .between(
            [trainingSessionId, Dexie.minKey],
            [trainingSessionId, Dexie.maxKey],
          )
          .toArray();
        const movements = await whereAnyOf(
          database.exerciseMovements,
          "trainingBlockId",
          blocks.map((block) => block.trainingBlockId),
        );
        const setRecords = await whereAnyOf(
          database.setRecords,
          "exerciseMovementId",
          movements.map((movement) => movement.exerciseMovementId),
        );
        const exercises = await database.exerciseDefinitions.bulkGet([
          ...new Set(
            movements.map((movement) => movement.exerciseDefinitionId),
          ),
        ]);
        const exercisesById = new Map(
          exercises.flatMap((exercise) =>
            exercise ? [[exercise.exerciseDefinitionId, exercise]] : [],
          ),
        );
        const movementsByBlock = groupBy(
          movements.toSorted(byPosition),
          (movement) => movement.trainingBlockId,
        );
        const setsByMovement = groupBy(
          setRecords.toSorted(byPosition),
          (setRecord) => setRecord.exerciseMovementId,
        );
        return {
          session,
          blocks: blocks.map((block) => ({
            block,
            movements: (
              movementsByBlock.get(block.trainingBlockId) ?? []
            ).flatMap((movement) => {
              const exercise = exercisesById.get(movement.exerciseDefinitionId);
              if (!exercise) return [];
              return [
                {
                  movement,
                  exercise,
                  sets: setsByMovement.get(movement.exerciseMovementId) ?? [],
                },
              ];
            }),
          })),
        };
      },
    );
  },

  async list(): Promise<TrainingSession[]> {
    return (await database.trainingSessions.toArray()).toSorted(
      byNewestSession,
    );
  },

  async listRecent(limit = 4): Promise<TrainingSession[]> {
    return (await sessionOperations.list()).slice(0, limit);
  },

  /** Borrador más reciente, esté donde esté en el historial. */
  async getActiveDraft(): Promise<TrainingSession | undefined> {
    const drafts = await database.trainingSessions
      .where("status")
      .equals("draft")
      .toArray();
    return drafts.toSorted(
      (left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        byNewestSession(left, right),
    )[0];
  },

  async update(
    trainingSessionId: string,
    changes: TrainingSessionChanges,
  ): Promise<void> {
    await initializeDatabase();
    const parsed = trainingSessionChangesSchema.parse(changes);
    const updated = await database.trainingSessions.update(
      trainingSessionId,
      toUpdateSpec<TrainingSession>(parsed, now()),
    );
    if (!updated) throw new Error("La sesión ya no existe");
  },

  async complete(trainingSessionId: string): Promise<void> {
    await initializeDatabase();
    const timestamp = now();
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
        session.updatedAt = now();
      });
    if (updated === 0) throw new Error("La sesión ya no existe");
  },

  async remove(trainingSessionId: string): Promise<void> {
    await initializeDatabase();
    await database.transaction("rw", sessionTables, async () => {
      const session = await database.trainingSessions.get(trainingSessionId);
      if (!session) throw new Error("La sesión ya no existe");
      const blockIds = (await database.trainingBlocks
        .where("trainingSessionId")
        .equals(trainingSessionId)
        .primaryKeys()) as string[];
      await deleteBlocksCascade(blockIds);
      await database.trainingSessions.delete(trainingSessionId);
    });
  },

  /** Nueva sesión de hoy con la misma estructura y sin resultados. */
  async duplicateSession(trainingSessionId: string): Promise<string> {
    await initializeDatabase();
    const timestamp = now();
    const targetSessionId = createUuid();
    await database.transaction("rw", sessionTables, async () => {
      const source = await database.trainingSessions.get(trainingSessionId);
      if (!source) throw new Error("La sesión ya no existe");
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
        await copyBlockInto(
          block,
          { trainingSessionId: targetSessionId, position: block.position },
          timestamp,
        );
      }
    });
    return targetSessionId;
  },
};
