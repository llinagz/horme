import type { Table, UpdateSpec } from "dexie";
import { pickDefined } from "@/domain/collections";
import type {
  ExerciseMovement,
  SetRecord,
  TrainingBlock,
  WodConfiguration,
} from "@/domain/entities";
import { createUuid } from "@/domain/ids";
import { database } from "../../database";

export const sessionTables = [
  database.trainingSessions,
  database.trainingBlocks,
  database.exerciseMovements,
  database.setRecords,
];

export function now(): string {
  return new Date().toISOString();
}

/**
 * Cambios validados listos para `Table.update`. Dexie elimina las propiedades
 * cuyo valor es `undefined`, que es como se vacía un campo opcional.
 */
export function toUpdateSpec<T>(
  changes: object,
  timestamp: string,
): UpdateSpec<T> {
  return { ...changes, updatedAt: timestamp } as unknown as UpdateSpec<T>;
}

/** Quita las claves `undefined` para no guardarlas en registros nuevos. */
export function withoutUndefined<T extends object>(
  value: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as { [K in keyof T]?: Exclude<T[K], undefined> };
}

/**
 * Marca la sesión como modificada. Debe llamarse dentro de la misma
 * transacción que la escritura que la provoca.
 */
export async function touchSession(
  trainingSessionId: string,
  timestamp: string,
): Promise<void> {
  await database.trainingSessions.update(trainingSessionId, {
    updatedAt: timestamp,
  });
}

export async function getBlockOrThrow(
  trainingBlockId: string,
): Promise<TrainingBlock> {
  const block = await database.trainingBlocks.get(trainingBlockId);
  if (!block) throw new Error("El bloque ya no existe");
  return block;
}

export async function getMovementOrThrow(
  exerciseMovementId: string,
): Promise<ExerciseMovement> {
  const movement = await database.exerciseMovements.get(exerciseMovementId);
  if (!movement) throw new Error("El ejercicio ya no existe en la sesión");
  return movement;
}

export async function getSessionIdForMovement(
  movement: ExerciseMovement,
): Promise<string> {
  return (await getBlockOrThrow(movement.trainingBlockId)).trainingSessionId;
}

/**
 * Registros cuyo índice coincide con alguna de las claves. Lanza una consulta
 * `equals` por clave en paralelo: `anyOf` recorre el índice con saltos de
 * cursor, que en algunas implementaciones de IndexedDB son lineales.
 */
export async function whereAnyOf<T, TInsert>(
  table: Table<T, string, TInsert>,
  index: string,
  keys: Iterable<string>,
): Promise<T[]> {
  const results = await Promise.all(
    [...new Set(keys)].map((key) => table.where(index).equals(key).toArray()),
  );
  return results.flat();
}

/** Siguiente posición libre entre los hijos de un padre. */
export async function nextPosition<T extends { position: number }, TInsert>(
  table: Table<T, string, TInsert>,
  parentIndex: string,
  parentId: string,
): Promise<number> {
  return table.where(parentIndex).equals(parentId).count();
}

/** Desplaza una posición hacia atrás a los hermanos que iban detrás. */
export async function closeGap<
  T extends { position: number; updatedAt: string },
  TInsert,
>(
  table: Table<T, string, TInsert>,
  parentIndex: string,
  parentId: string,
  removedPosition: number,
  timestamp: string,
): Promise<void> {
  await table
    .where(parentIndex)
    .equals(parentId)
    .and((item) => item.position > removedPosition)
    .modify((item) => {
      item.position -= 1;
      item.updatedAt = timestamp;
    });
}

export async function deleteMovementsCascade(
  movementIds: string[],
): Promise<void> {
  await Promise.all(
    movementIds.map((movementId) =>
      database.setRecords
        .where("exerciseMovementId")
        .equals(movementId)
        .delete(),
    ),
  );
  await database.exerciseMovements.bulkDelete(movementIds);
}

export async function deleteBlocksCascade(blockIds: string[]): Promise<void> {
  const movements = await whereAnyOf(
    database.exerciseMovements,
    "trainingBlockId",
    blockIds,
  );
  const movementIds = movements.map((movement) => movement.exerciseMovementId);
  await deleteMovementsCascade(movementIds);
  await database.trainingBlocks.bulkDelete(blockIds);
}

/** Estructura de un WOD sin sus resultados, para duplicarlo. */
export function copyWodStructure(
  wodConfiguration: WodConfiguration | undefined,
): WodConfiguration | undefined {
  if (!wodConfiguration) return undefined;
  return {
    format: wodConfiguration.format,
    scaling: wodConfiguration.scaling,
    ...pickDefined(wodConfiguration, [
      "name",
      "prescription",
      "durationSeconds",
      "timeCapSeconds",
      "plannedRounds",
      "intervalSeconds",
      "notes",
    ]),
  };
}

/** Copia un bloque (sin resultados) dentro de la sesión indicada. */
export async function copyBlockInto(
  source: TrainingBlock,
  target: Pick<TrainingBlock, "trainingSessionId" | "position">,
  timestamp: string,
): Promise<string> {
  const wodConfiguration = copyWodStructure(source.wodConfiguration);
  const blockFields: TrainingBlock = { ...source };
  delete blockFields.wodConfiguration;
  const trainingBlockId = createUuid();
  await database.trainingBlocks.add({
    ...blockFields,
    ...target,
    trainingBlockId,
    ...(wodConfiguration ? { wodConfiguration } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const movements = await database.exerciseMovements
    .where("trainingBlockId")
    .equals(source.trainingBlockId)
    .toArray();
  const setRecords = await whereAnyOf(
    database.setRecords,
    "exerciseMovementId",
    movements.map((movement) => movement.exerciseMovementId),
  );
  const copiedMovements: ExerciseMovement[] = [];
  const copiedSets: SetRecord[] = [];
  for (const movement of movements) {
    const exerciseMovementId = createUuid();
    copiedMovements.push({
      ...movement,
      exerciseMovementId,
      trainingBlockId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    for (const setRecord of setRecords) {
      if (setRecord.exerciseMovementId !== movement.exerciseMovementId)
        continue;
      copiedSets.push({
        ...setRecord,
        setRecordId: createUuid(),
        exerciseMovementId,
        isCompleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }
  await database.exerciseMovements.bulkAdd(copiedMovements);
  await database.setRecords.bulkAdd(copiedSets);
  return trainingBlockId;
}
