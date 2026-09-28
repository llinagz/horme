import { beforeEach, describe, expect, it } from "vitest";
import {
  addTestExercise,
  clearDatabase,
  createStrengthSession,
  getSortedSets,
} from "@/test/database-helpers";
import { database } from "./database";
import { trainingSessionRepository } from "./repositories/training-session-repository";

beforeEach(async () => {
  await clearDatabase();
  await addTestExercise();
});

function positionsOf(items: Array<{ position: number }>): number[] {
  return items.map((item) => item.position).toSorted((a, b) => a - b);
}

describe("dobles toques", () => {
  it("dos bloques añadidos a la vez reciben posiciones distintas", async () => {
    const sessionId = await trainingSessionRepository.create("2026-08-08");
    await Promise.all([
      trainingSessionRepository.addBlock(sessionId, "strength"),
      trainingSessionRepository.addBlock(sessionId, "wod"),
    ]);
    const blocks = await database.trainingBlocks
      .where("trainingSessionId")
      .equals(sessionId)
      .toArray();
    expect(positionsOf(blocks)).toEqual([0, 1]);
  });

  it("dos ejercicios añadidos a la vez reciben posiciones distintas", async () => {
    const { blockId } = await createStrengthSession();
    await Promise.all([
      trainingSessionRepository.addMovement(blockId, "test-deadlift"),
      trainingSessionRepository.addMovement(blockId, "test-deadlift"),
    ]);
    const movements = await database.exerciseMovements
      .where("trainingBlockId")
      .equals(blockId)
      .toArray();
    expect(positionsOf(movements)).toEqual([0, 1, 2]);
  });

  it("repetir la última serie dos veces a la vez crea dos series seguidas", async () => {
    const { movementId } = await createStrengthSession({
      setCount: 1,
      repetitions: 5,
    });
    await Promise.all([
      trainingSessionRepository.repeatLastSet(movementId),
      trainingSessionRepository.repeatLastSet(movementId),
    ]);
    expect(positionsOf(await getSortedSets(movementId))).toEqual([0, 1, 2]);
  });

  it("crear series iguales a la vez no solapa posiciones", async () => {
    const { movementId } = await createStrengthSession();
    await Promise.all([
      trainingSessionRepository.addRepeatedSets(movementId, 2, {}),
      trainingSessionRepository.addRepeatedSets(movementId, 2, {}),
    ]);
    expect(positionsOf(await getSortedSets(movementId))).toEqual([0, 1, 2, 3]);
  });
});

describe("fecha de modificación de la sesión", () => {
  it("cambia con cualquier escritura dentro de la sesión", async () => {
    const { sessionId, blockId, movementId } = await createStrengthSession({
      setCount: 1,
    });
    const setRecordId = (await getSortedSets(movementId))[0]!.setRecordId;
    const writes: Array<() => Promise<unknown>> = [
      () => trainingSessionRepository.addMovement(blockId, "test-deadlift"),
      () =>
        trainingSessionRepository.updateMovement(movementId, { notes: "x" }),
      () => trainingSessionRepository.updateBlock(blockId, { title: "y" }),
      () => trainingSessionRepository.addRepeatedSets(movementId, 1, {}),
      () => trainingSessionRepository.repeatLastSet(movementId),
      () =>
        trainingSessionRepository.updateSet(setRecordId, { isCompleted: true }),
      () =>
        trainingSessionRepository.updateSetMetric(
          setRecordId,
          "repetitions",
          3,
        ),
    ];
    for (const write of writes) {
      const before = (await database.trainingSessions.get(sessionId))!
        .updatedAt;
      await new Promise((resolve) => setTimeout(resolve, 2));
      await write();
      const after = (await database.trainingSessions.get(sessionId))!.updatedAt;
      expect(after > before, write.toString()).toBe(true);
    }
  });
});
