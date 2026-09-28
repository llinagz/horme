import { liveQuery } from "dexie";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addTestExercise,
  clearDatabase,
  createStrengthSession,
} from "@/test/database-helpers";
import { getBackupStatus, markBackupCreated } from "./backup";
import { database } from "./database";
import { trainingSessionRepository } from "./repositories/training-session-repository";

/**
 * Se suscribe a una consulta reactiva, ejecuta `write` tras el primer valor y
 * resuelve con el primer valor emitido que cumple `predicate`.
 */
function waitForLiveValue<T>(
  query: () => Promise<T>,
  write: () => Promise<unknown>,
  predicate: (value: T) => boolean,
  timeoutMilliseconds = 1500,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let hasWritten = false;
    const timer = setTimeout(() => {
      subscription.unsubscribe();
      reject(new Error("La consulta reactiva no emitió el valor esperado"));
    }, timeoutMilliseconds);
    const subscription = liveQuery(query).subscribe({
      next(value) {
        if (!hasWritten) {
          hasWritten = true;
          write().catch(reject);
          return;
        }
        if (predicate(value)) {
          clearTimeout(timer);
          subscription.unsubscribe();
          resolve(value);
        }
      },
      error: reject,
    });
  });
}

beforeEach(async () => {
  await clearDatabase();
  await addTestExercise();
});

describe("consultas reactivas", () => {
  it("control: una consulta directa a Dexie reacciona", async () => {
    const { sessionId } = await createStrengthSession();
    const count = await waitForLiveValue(
      () => database.trainingSessions.count(),
      () => trainingSessionRepository.remove(sessionId),
      (value) => value === 0,
    );
    expect(count).toBe(0);
  });

  it("la lista de sesiones se actualiza al eliminar una sesión", async () => {
    const { sessionId } = await createStrengthSession();
    const sessions = await waitForLiveValue(
      () => trainingSessionRepository.list(),
      () => trainingSessionRepository.remove(sessionId),
      (value) => value.length === 0,
    );
    expect(sessions).toEqual([]);
  });

  it("el agregado de la sesión se actualiza al añadir series", async () => {
    const { sessionId, movementId } = await createStrengthSession();
    const aggregate = await waitForLiveValue(
      () => trainingSessionRepository.get(sessionId),
      () =>
        trainingSessionRepository.addRepeatedSets(movementId, 2, {
          repetitions: 5,
        }),
      (value) => value?.blocks[0]?.movements[0]?.sets.length === 2,
    );
    expect(aggregate?.blocks[0]?.movements[0]?.sets).toHaveLength(2);
  });

  it("el estado de la copia se actualiza al marcarla como creada", async () => {
    await createStrengthSession();
    const status = await waitForLiveValue(
      () => getBackupStatus(),
      () => markBackupCreated(new Date().toISOString()),
      (value) => !value.shouldRemind,
    );
    expect(status.lastBackupAt).toBeDefined();
  });
});
