import type { z } from "zod";
import type { ExerciseMetric, SetRecord } from "@/domain/entities";
import { createUuid } from "@/domain/ids";
import {
  setMetricSchemas,
  setRecordChangesSchema,
  setValuesSchema,
} from "@/domain/schemas";
import { database, initializeDatabase } from "../../database";
import {
  closeGap,
  getMovementOrThrow,
  getSessionIdForMovement,
  nextPosition,
  now,
  sessionTables,
  toUpdateSpec,
  touchSession,
  withoutUndefined,
} from "./shared";

export type SetValues = z.input<typeof setValuesSchema>;
export type SetRecordChanges = z.input<typeof setRecordChangesSchema>;

async function getSetOrThrow(setRecordId: string) {
  const setRecord = await database.setRecords.get(setRecordId);
  if (!setRecord) throw new Error("La serie ya no existe");
  return setRecord;
}

async function touchSessionForSet(
  exerciseMovementId: string,
  timestamp: string,
): Promise<void> {
  const movement = await getMovementOrThrow(exerciseMovementId);
  await touchSession(await getSessionIdForMovement(movement), timestamp);
}

export const setOperations = {
  async addRepeatedSets(
    exerciseMovementId: string,
    count: number,
    values: SetValues,
  ): Promise<void> {
    await initializeDatabase();
    if (!Number.isInteger(count) || count < 1 || count > 20)
      throw new Error("El número de series debe estar entre 1 y 20");
    const parsed = setValuesSchema.parse(values);
    const timestamp = now();
    await database.transaction("rw", sessionTables, async () => {
      await getMovementOrThrow(exerciseMovementId);
      const firstPosition = await nextPosition(
        database.setRecords,
        "exerciseMovementId",
        exerciseMovementId,
      );
      await database.setRecords.bulkAdd(
        Array.from({ length: count }, (_, index) => ({
          setRecordId: createUuid(),
          exerciseMovementId,
          position: firstPosition + index,
          ...withoutUndefined(parsed),
          isCompleted: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
      );
      await touchSessionForSet(exerciseMovementId, timestamp);
    });
  },

  async repeatLastSet(exerciseMovementId: string): Promise<void> {
    await initializeDatabase();
    const timestamp = now();
    await database.transaction("rw", sessionTables, async () => {
      const sets = await database.setRecords
        .where("exerciseMovementId")
        .equals(exerciseMovementId)
        .sortBy("position");
      const last = sets.at(-1);
      if (!last) throw new Error("Todavía no hay una serie que repetir");
      await database.setRecords.add({
        ...last,
        setRecordId: createUuid(),
        position: last.position + 1,
        isCompleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await touchSessionForSet(exerciseMovementId, timestamp);
    });
  },

  async removeSet(setRecordId: string): Promise<void> {
    await initializeDatabase();
    const timestamp = now();
    await database.transaction("rw", sessionTables, async () => {
      const source = await getSetOrThrow(setRecordId);
      await database.setRecords.delete(setRecordId);
      await closeGap(
        database.setRecords,
        "exerciseMovementId",
        source.exerciseMovementId,
        source.position,
        timestamp,
      );
      await touchSessionForSet(source.exerciseMovementId, timestamp);
    });
  },

  async updateSet(
    setRecordId: string,
    changes: SetRecordChanges,
  ): Promise<void> {
    await initializeDatabase();
    const parsed = setRecordChangesSchema.parse(changes);
    const timestamp = now();
    await database.transaction("rw", sessionTables, async () => {
      const source = await getSetOrThrow(setRecordId);
      await database.setRecords.update(
        setRecordId,
        toUpdateSpec<SetRecord>(parsed, timestamp),
      );
      await touchSessionForSet(source.exerciseMovementId, timestamp);
    });
  },

  /** Guarda una métrica de la serie; `undefined` la deja vacía. */
  async updateSetMetric(
    setRecordId: string,
    metric: ExerciseMetric,
    value: number | undefined,
  ): Promise<void> {
    await initializeDatabase();
    const parsed =
      value === undefined ? undefined : setMetricSchemas[metric].parse(value);
    const timestamp = now();
    await database.transaction("rw", sessionTables, async () => {
      const source = await getSetOrThrow(setRecordId);
      await database.setRecords
        .where("setRecordId")
        .equals(setRecordId)
        .modify((setRecord) => {
          setRecord.updatedAt = timestamp;
          if (parsed === undefined) delete setRecord[metric];
          else setRecord[metric] = parsed;
        });
      await touchSessionForSet(source.exerciseMovementId, timestamp);
    });
  },
};
