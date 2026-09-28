import { beforeEach, describe, expect, it } from "vitest";
import {
  addTestExercise,
  clearDatabase,
  createStrengthSession,
  getSortedSets,
} from "@/test/database-helpers";
import { database } from "../database";
import { trainingSessionRepository } from "./training-session-repository";

beforeEach(async () => {
  await clearDatabase();
  await addTestExercise();
});

describe("sesiones", () => {
  it("lista las sesiones por fecha descendente y limita las recientes", async () => {
    await trainingSessionRepository.create("2026-08-01");
    await trainingSessionRepository.create("2026-08-03");
    await trainingSessionRepository.create("2026-08-02");

    const dates = (await trainingSessionRepository.list()).map(
      (session) => session.sessionDate,
    );
    expect(dates).toEqual(["2026-08-03", "2026-08-02", "2026-08-01"]);
    expect(await trainingSessionRepository.listRecent(2)).toHaveLength(2);
  });

  it("finaliza y reabre una sesión", async () => {
    const sessionId = await trainingSessionRepository.create("2026-08-08");

    await trainingSessionRepository.complete(sessionId);
    const completed = await database.trainingSessions.get(sessionId);
    expect(completed).toMatchObject({ status: "completed" });
    expect(completed?.completedAt).toBeDefined();

    await trainingSessionRepository.reopen(sessionId);
    const reopened = await database.trainingSessions.get(sessionId);
    expect(reopened).toMatchObject({ status: "draft" });
    expect(reopened?.completedAt).toBeUndefined();
  });

  it("avisa si la sesión ya no existe", async () => {
    await expect(trainingSessionRepository.complete("nope")).rejects.toThrow(
      "La sesión ya no existe",
    );
    await expect(trainingSessionRepository.reopen("nope")).rejects.toThrow(
      "La sesión ya no existe",
    );
    await expect(
      trainingSessionRepository.update("nope", { feelings: "x" }),
    ).rejects.toThrow("La sesión ya no existe");
    expect(await trainingSessionRepository.get("nope")).toBeUndefined();
  });

  it("guarda valoración y sensaciones", async () => {
    const sessionId = await trainingSessionRepository.create("2026-08-08");
    await trainingSessionRepository.update(sessionId, {
      perceivedExertion: 8,
      painLevel: 2,
      feelings: "Bien",
    });
    expect(await database.trainingSessions.get(sessionId)).toMatchObject({
      perceivedExertion: 8,
      painLevel: 2,
      feelings: "Bien",
    });
  });
});

describe("bloques", () => {
  it("crea bloques con título por defecto y WOD con configuración inicial", async () => {
    const sessionId = await trainingSessionRepository.create("2026-08-08");
    const strengthId = await trainingSessionRepository.addBlock(
      sessionId,
      "strength",
    );
    const wodId = await trainingSessionRepository.addBlock(sessionId, "wod");

    expect(await database.trainingBlocks.get(strengthId)).toMatchObject({
      title: "Fuerza",
      position: 0,
    });
    expect(await database.trainingBlocks.get(wodId)).toMatchObject({
      title: "WOD",
      position: 1,
      wodConfiguration: { format: "for-time", scaling: "rx" },
    });
  });

  it("mueve un bloque y no hace nada en los extremos", async () => {
    const sessionId = await trainingSessionRepository.create("2026-08-08");
    const firstId = await trainingSessionRepository.addBlock(
      sessionId,
      "strength",
    );
    const secondId = await trainingSessionRepository.addBlock(sessionId, "wod");

    await trainingSessionRepository.moveBlock(firstId, -1);
    expect((await database.trainingBlocks.get(firstId))?.position).toBe(0);

    await trainingSessionRepository.moveBlock(firstId, 1);
    expect((await database.trainingBlocks.get(firstId))?.position).toBe(1);
    expect((await database.trainingBlocks.get(secondId))?.position).toBe(0);

    await trainingSessionRepository.moveBlock(firstId, 1);
    expect((await database.trainingBlocks.get(firstId))?.position).toBe(1);
  });

  it("duplica un bloque justo detrás, con series sin completar", async () => {
    const { sessionId, blockId, movementId } = await createStrengthSession({
      setCount: 2,
      repetitions: 5,
      weightKilograms: 100,
    });
    const lastBlockId = await trainingSessionRepository.addBlock(
      sessionId,
      "free",
    );
    const firstSet = (await getSortedSets(movementId))[0]!;
    await trainingSessionRepository.updateSet(firstSet.setRecordId, {
      isCompleted: true,
    });

    const copyId = await trainingSessionRepository.duplicateBlock(blockId);

    expect((await database.trainingBlocks.get(copyId))?.position).toBe(1);
    expect((await database.trainingBlocks.get(lastBlockId))?.position).toBe(2);
    const aggregate = await trainingSessionRepository.get(sessionId);
    const copiedSets = aggregate?.blocks[1]?.movements[0]?.sets ?? [];
    expect(copiedSets).toHaveLength(2);
    expect(copiedSets.every((setRecord) => !setRecord.isCompleted)).toBe(true);
    expect(copiedSets[0]).toMatchObject({
      repetitions: 5,
      weightKilograms: 100,
    });
  });

  it("actualiza título y notas", async () => {
    const { blockId } = await createStrengthSession();
    await trainingSessionRepository.updateBlock(blockId, {
      title: "Sentadilla",
      notes: "Tempo 3-1-1",
    });
    expect(await database.trainingBlocks.get(blockId)).toMatchObject({
      title: "Sentadilla",
      notes: "Tempo 3-1-1",
    });
  });
});

describe("ejercicios y series", () => {
  it("añade ejercicios en orden y guarda la prescripción", async () => {
    const { blockId, movementId } = await createStrengthSession();
    const secondId = await trainingSessionRepository.addMovement(
      blockId,
      "test-deadlift",
    );
    await trainingSessionRepository.updateMovement(movementId, {
      prescription: "5 × 5",
      notes: "Cinturón",
    });

    expect((await database.exerciseMovements.get(secondId))?.position).toBe(1);
    expect(await database.exerciseMovements.get(movementId)).toMatchObject({
      prescription: "5 × 5",
      notes: "Cinturón",
    });
  });

  it("crea series iguales dentro de los límites", async () => {
    const { movementId } = await createStrengthSession({
      setCount: 3,
      repetitions: 1,
      weightKilograms: 115,
    });
    const sets = await getSortedSets(movementId);
    expect(sets.map((setRecord) => setRecord.position)).toEqual([0, 1, 2]);
    expect(sets[2]).toMatchObject({ repetitions: 1, weightKilograms: 115 });

    await expect(
      trainingSessionRepository.addRepeatedSets(movementId, 0, {}),
    ).rejects.toThrow("entre 1 y 20");
    await expect(
      trainingSessionRepository.addRepeatedSets(movementId, 21, {}),
    ).rejects.toThrow("entre 1 y 20");
  });

  it("repite la última serie sin completar", async () => {
    const { movementId } = await createStrengthSession({
      setCount: 1,
      repetitions: 3,
      weightKilograms: 90,
    });
    const first = (await getSortedSets(movementId))[0]!;
    await trainingSessionRepository.updateSet(first.setRecordId, {
      isCompleted: true,
    });

    await trainingSessionRepository.repeatLastSet(movementId);

    const sets = await getSortedSets(movementId);
    expect(sets[1]).toMatchObject({
      position: 1,
      repetitions: 3,
      weightKilograms: 90,
      isCompleted: false,
    });
  });

  it("no repite si todavía no hay series", async () => {
    const { movementId } = await createStrengthSession();
    await expect(
      trainingSessionRepository.repeatLastSet(movementId),
    ).rejects.toThrow("Todavía no hay una serie que repetir");
  });

  it("actualiza y borra una métrica de la serie", async () => {
    const { movementId } = await createStrengthSession({
      setCount: 1,
      repetitions: 5,
      weightKilograms: 60,
    });
    const setRecord = (await getSortedSets(movementId))[0]!;

    await trainingSessionRepository.updateSetMetric(
      setRecord.setRecordId,
      "weightKilograms",
      62.5,
    );
    expect(
      (await database.setRecords.get(setRecord.setRecordId))?.weightKilograms,
    ).toBe(62.5);

    await trainingSessionRepository.updateSetMetric(
      setRecord.setRecordId,
      "weightKilograms",
      undefined,
    );
    expect(
      await database.setRecords.get(setRecord.setRecordId),
    ).not.toHaveProperty("weightKilograms");

    await expect(
      trainingSessionRepository.updateSetMetric("nope", "repetitions", 1),
    ).rejects.toThrow("La serie ya no existe");
  });
});

describe("historial", () => {
  it("devuelve el historial de un ejercicio y la entrada anterior", async () => {
    const older = await createStrengthSession({
      sessionDate: "2026-08-01",
      setCount: 1,
      repetitions: 5,
      weightKilograms: 100,
    });
    const newer = await createStrengthSession({
      sessionDate: "2026-08-05",
      setCount: 1,
      repetitions: 3,
      weightKilograms: 110,
    });

    const history =
      await trainingSessionRepository.listExerciseHistory("test-deadlift");
    expect(history.map((entry) => entry.session.sessionDate)).toEqual([
      "2026-08-05",
      "2026-08-01",
    ]);
    expect(history[0]?.sets[0]).toMatchObject({ weightKilograms: 110 });

    const previous = await trainingSessionRepository.getLastExerciseEntry(
      "test-deadlift",
      newer.sessionId,
    );
    expect(previous?.session.trainingSessionId).toBe(older.sessionId);
  });

  it("lista los ejercicios con historial por nombre", async () => {
    await addTestExercise({
      exerciseDefinitionId: "test-air-squat",
      name: "Air squat",
      metrics: ["repetitions"],
    });
    await addTestExercise({
      exerciseDefinitionId: "test-unused",
      name: "Sin uso",
    });
    await createStrengthSession();
    await createStrengthSession({ exerciseDefinitionId: "test-air-squat" });

    const definitions =
      await trainingSessionRepository.listExerciseDefinitionsWithHistory();
    expect(definitions.map((definition) => definition.name)).toEqual([
      "Air squat",
      "Peso muerto",
    ]);
  });

  it("lista solo los WOD con nombre", async () => {
    const sessionId = await trainingSessionRepository.create("2026-08-08");
    const namedId = await trainingSessionRepository.addBlock(sessionId, "wod");
    await trainingSessionRepository.addBlock(sessionId, "wod");
    await trainingSessionRepository.updateBlock(namedId, {
      wodConfiguration: { name: "Fran", format: "for-time", scaling: "rx" },
    });

    const wods = await trainingSessionRepository.listWodHistory();
    expect(wods).toHaveLength(1);
    expect(wods[0]?.block.wodConfiguration?.name).toBe("Fran");
  });
});
