import type { z } from "zod";
import type { ExerciseMovement } from "@/domain/entities";
import { createUuid } from "@/domain/ids";
import { exerciseMovementChangesSchema } from "@/domain/schemas";
import { database, initializeDatabase } from "../../database";
import {
  closeGap,
  deleteMovementsCascade,
  getBlockOrThrow,
  getMovementOrThrow,
  getSessionIdForMovement,
  nextPosition,
  now,
  sessionTables,
  toUpdateSpec,
  touchSession,
} from "./shared";

export type ExerciseMovementChanges = z.input<
  typeof exerciseMovementChangesSchema
>;

const movementTables = [...sessionTables, database.exerciseDefinitions];

export const movementOperations = {
  async addMovement(
    trainingBlockId: string,
    exerciseDefinitionId: string,
  ): Promise<string> {
    await initializeDatabase();
    const timestamp = now();
    const exerciseMovementId = createUuid();
    await database.transaction("rw", movementTables, async () => {
      const block = await getBlockOrThrow(trainingBlockId);
      if (!(await database.exerciseDefinitions.get(exerciseDefinitionId)))
        throw new Error("El ejercicio ya no existe");
      await database.exerciseMovements.add({
        exerciseMovementId,
        trainingBlockId,
        exerciseDefinitionId,
        position: await nextPosition(
          database.exerciseMovements,
          "trainingBlockId",
          trainingBlockId,
        ),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await touchSession(block.trainingSessionId, timestamp);
    });
    return exerciseMovementId;
  },

  async updateMovement(
    exerciseMovementId: string,
    changes: ExerciseMovementChanges,
  ): Promise<void> {
    await initializeDatabase();
    const parsed = exerciseMovementChangesSchema.parse(changes);
    const timestamp = now();
    await database.transaction("rw", sessionTables, async () => {
      const movement = await getMovementOrThrow(exerciseMovementId);
      await database.exerciseMovements.update(
        exerciseMovementId,
        toUpdateSpec<ExerciseMovement>(parsed, timestamp),
      );
      await touchSession(await getSessionIdForMovement(movement), timestamp);
    });
  },

  async removeMovement(exerciseMovementId: string): Promise<void> {
    await initializeDatabase();
    const timestamp = now();
    await database.transaction("rw", sessionTables, async () => {
      const source = await getMovementOrThrow(exerciseMovementId);
      const sessionId = await getSessionIdForMovement(source);
      await deleteMovementsCascade([exerciseMovementId]);
      await closeGap(
        database.exerciseMovements,
        "trainingBlockId",
        source.trainingBlockId,
        source.position,
        timestamp,
      );
      await touchSession(sessionId, timestamp);
    });
  },
};
