import { beforeEach, describe, expect, it } from "vitest";
import { knownLiftRepository } from "@/infrastructure/repositories/known-lift-repository";
import { trainingSessionRepository } from "@/infrastructure/repositories/training-session-repository";
import {
  addTestExercise,
  clearDatabase,
  createStrengthSession,
  getSortedSets,
} from "@/test/database-helpers";
import { addExerciseToBlock } from "./add-exercise";

beforeEach(async () => {
  await clearDatabase();
  await addTestExercise();
});

describe("añadir un ejercicio a la sesión", () => {
  it("repite las series de la última vez, pendientes", async () => {
    const previous = await createStrengthSession({ sessionDate: "2026-09-14" });
    await trainingSessionRepository.addSets(previous.movementId, [
      { repetitions: 3, weightKilograms: 100 },
      { repetitions: 3, weightKilograms: 102.5 },
    ]);
    for (const setRecord of await getSortedSets(previous.movementId))
      await trainingSessionRepository.updateSet(setRecord.setRecordId, {
        isCompleted: true,
      });

    const sessionId = await trainingSessionRepository.create("2026-09-28");
    const blockId = await trainingSessionRepository.addBlock(
      sessionId,
      "strength",
    );
    const movementId = await addExerciseToBlock(
      blockId,
      "test-deadlift",
      sessionId,
    );

    const sets = await getSortedSets(movementId);
    expect(sets).toMatchObject([
      { position: 0, repetitions: 3, weightKilograms: 100, isCompleted: false },
      {
        position: 1,
        repetitions: 3,
        weightKilograms: 102.5,
        isCompleted: false,
      },
    ]);
  });

  it("sin historial crea tres series vacías", async () => {
    const sessionId = await trainingSessionRepository.create("2026-09-28");
    const blockId = await trainingSessionRepository.addBlock(
      sessionId,
      "strength",
    );
    const movementId = await addExerciseToBlock(
      blockId,
      "test-deadlift",
      sessionId,
    );
    const sets = await getSortedSets(movementId);
    expect(sets).toHaveLength(3);
    expect(sets[0]).not.toHaveProperty("weightKilograms");
  });

  it("sin historial precarga tres series con la marca registrada", async () => {
    await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 100,
      repetitions: 5,
    });
    const sessionId = await trainingSessionRepository.create("2026-09-28");
    const blockId = await trainingSessionRepository.addBlock(
      sessionId,
      "strength",
    );
    const movementId = await addExerciseToBlock(
      blockId,
      "test-deadlift",
      sessionId,
    );

    expect(await getSortedSets(movementId)).toMatchObject([
      { repetitions: 5, weightKilograms: 100, isCompleted: false },
      { repetitions: 5, weightKilograms: 100, isCompleted: false },
      { repetitions: 5, weightKilograms: 100, isCompleted: false },
    ]);
  });

  it("el historial de sesiones tiene prioridad sobre la marca registrada", async () => {
    await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 100,
      repetitions: 5,
    });
    const previous = await createStrengthSession({
      sessionDate: "2026-09-14",
      setCount: 1,
      repetitions: 3,
      weightKilograms: 130,
    });
    const sessionId = await trainingSessionRepository.create("2026-09-28");
    const blockId = await trainingSessionRepository.addBlock(
      sessionId,
      "strength",
    );
    const movementId = await addExerciseToBlock(
      blockId,
      "test-deadlift",
      sessionId,
    );

    expect(previous.movementId).not.toBe(movementId);
    expect(await getSortedSets(movementId)).toMatchObject([
      { repetitions: 3, weightKilograms: 130 },
    ]);
  });
});

describe("deshacer el borrado de una serie", () => {
  it("vuelve a su sitio y recoloca las demás", async () => {
    const { movementId } = await createStrengthSession();
    await trainingSessionRepository.addSets(movementId, [
      { repetitions: 1 },
      { repetitions: 2 },
      { repetitions: 3 },
    ]);
    const removed = (await getSortedSets(movementId))[1]!;
    await trainingSessionRepository.removeSet(removed.setRecordId);
    await trainingSessionRepository.restoreSet(removed);

    const sets = await getSortedSets(movementId);
    expect(sets.map((setRecord) => setRecord.repetitions)).toEqual([1, 2, 3]);
    expect(sets.map((setRecord) => setRecord.position)).toEqual([0, 1, 2]);
    expect(sets[1]?.setRecordId).toBe(removed.setRecordId);
  });
});

describe("resúmenes de sesión", () => {
  it("cuenta series y nombra bloques y ejercicios", async () => {
    const { sessionId, movementId } = await createStrengthSession({
      sessionDate: "2026-09-28",
      setCount: 3,
      repetitions: 5,
    });
    const first = (await getSortedSets(movementId))[0]!;
    await trainingSessionRepository.updateSet(first.setRecordId, {
      isCompleted: true,
    });
    const wodId = await trainingSessionRepository.addBlock(sessionId, "wod");
    await trainingSessionRepository.updateBlock(wodId, {
      wodConfiguration: { name: "Fran", format: "for-time", scaling: "rx" },
    });
    await trainingSessionRepository.create("2026-09-20");

    const summaries = await trainingSessionRepository.listSessionSummaries();
    expect(summaries.map((summary) => summary.session.sessionDate)).toEqual([
      "2026-09-28",
      "2026-09-20",
    ]);
    expect(summaries[0]).toMatchObject({
      blockTitles: ["Fuerza", "Fran"],
      exerciseNames: ["Peso muerto"],
      setCount: 3,
      completedSetCount: 1,
    });
  });
});
