import type { z } from "zod";
import type { TrainingBlock, TrainingBlockType } from "@/domain/entities";
import { createUuid } from "@/domain/ids";
import { trainingBlockTitles } from "@/domain/labels";
import { trainingBlockChangesSchema } from "@/domain/schemas";
import { database, initializeDatabase } from "../../database";
import {
  closeGap,
  copyBlockInto,
  deleteBlocksCascade,
  getBlockOrThrow,
  nextPosition,
  now,
  sessionTables,
  toUpdateSpec,
  touchSession,
} from "./shared";

export type TrainingBlockChanges = z.input<typeof trainingBlockChangesSchema>;

export const blockOperations = {
  async addBlock(
    trainingSessionId: string,
    type: TrainingBlockType,
  ): Promise<string> {
    await initializeDatabase();
    const timestamp = now();
    const trainingBlockId = createUuid();
    await database.transaction("rw", sessionTables, async () => {
      if (!(await database.trainingSessions.get(trainingSessionId)))
        throw new Error("La sesión ya no existe");
      await database.trainingBlocks.add({
        trainingBlockId,
        trainingSessionId,
        type,
        title: trainingBlockTitles[type],
        position: await nextPosition(
          database.trainingBlocks,
          "trainingSessionId",
          trainingSessionId,
        ),
        ...(type === "wod"
          ? { wodConfiguration: { format: "for-time", scaling: "rx" } }
          : {}),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await touchSession(trainingSessionId, timestamp);
    });
    return trainingBlockId;
  },

  async updateBlock(
    trainingBlockId: string,
    changes: TrainingBlockChanges,
  ): Promise<void> {
    await initializeDatabase();
    const parsed = trainingBlockChangesSchema.parse(changes);
    const timestamp = now();
    await database.transaction("rw", sessionTables, async () => {
      const block = await getBlockOrThrow(trainingBlockId);
      await database.trainingBlocks.update(
        trainingBlockId,
        toUpdateSpec<TrainingBlock>(parsed, timestamp),
      );
      await touchSession(block.trainingSessionId, timestamp);
    });
  },

  async moveBlock(trainingBlockId: string, direction: -1 | 1): Promise<void> {
    await initializeDatabase();
    const timestamp = now();
    await database.transaction("rw", sessionTables, async () => {
      const source = await getBlockOrThrow(trainingBlockId);
      const blocks = await database.trainingBlocks
        .where("trainingSessionId")
        .equals(source.trainingSessionId)
        .sortBy("position");
      const sourceIndex = blocks.findIndex(
        (block) => block.trainingBlockId === trainingBlockId,
      );
      const target = blocks[sourceIndex + direction];
      if (!target) return;
      await database.trainingBlocks.update(source.trainingBlockId, {
        position: target.position,
        updatedAt: timestamp,
      });
      await database.trainingBlocks.update(target.trainingBlockId, {
        position: source.position,
        updatedAt: timestamp,
      });
      await touchSession(source.trainingSessionId, timestamp);
    });
  },

  /** Copia el bloque justo detrás del original, sin resultados. */
  async duplicateBlock(trainingBlockId: string): Promise<string> {
    await initializeDatabase();
    const timestamp = now();
    return database.transaction("rw", sessionTables, async () => {
      const source = await getBlockOrThrow(trainingBlockId);
      await database.trainingBlocks
        .where("trainingSessionId")
        .equals(source.trainingSessionId)
        .and((block) => block.position > source.position)
        .modify((block) => {
          block.position += 1;
        });
      const copyId = await copyBlockInto(
        source,
        {
          trainingSessionId: source.trainingSessionId,
          position: source.position + 1,
        },
        timestamp,
      );
      await touchSession(source.trainingSessionId, timestamp);
      return copyId;
    });
  },

  async removeBlock(trainingBlockId: string): Promise<void> {
    await initializeDatabase();
    const timestamp = now();
    await database.transaction("rw", sessionTables, async () => {
      const source = await getBlockOrThrow(trainingBlockId);
      await deleteBlocksCascade([trainingBlockId]);
      await closeGap(
        database.trainingBlocks,
        "trainingSessionId",
        source.trainingSessionId,
        source.position,
        timestamp,
      );
      await touchSession(source.trainingSessionId, timestamp);
    });
  },
};
