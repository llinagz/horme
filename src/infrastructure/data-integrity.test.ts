import fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addTestExercise,
  clearDatabase,
  createStrengthSession,
  getSortedSets,
} from "@/test/database-helpers";
import { createBackup, parseBackup } from "./backup";
import { database } from "./database";
import { exerciseDefinitionRepository } from "./repositories/exercise-definition-repository";
import { knownLiftRepository } from "./repositories/known-lift-repository";
import { trainingSessionRepository } from "./repositories/training-session-repository";

beforeEach(async () => {
  await clearDatabase();
  await addTestExercise();
});

/** Ejecuta una escritura ignorando si el repositorio la rechaza. */
async function attempt(write: () => Promise<unknown>): Promise<void> {
  try {
    await write();
  } catch {
    // Rechazar una entrada inválida es un resultado correcto.
  }
}

describe("las escrituras nunca dejan datos que la copia no pueda restaurar", () => {
  it("rechaza una fecha de sesión vacía o inválida", async () => {
    const sessionId = await trainingSessionRepository.create("2026-08-08");
    await expect(
      trainingSessionRepository.update(sessionId, { sessionDate: "" }),
    ).rejects.toThrow("La fecha no es válida");
    await expect(
      trainingSessionRepository.update(sessionId, {
        sessionDate: "2026-02-30",
      }),
    ).rejects.toThrow("La fecha no es válida");
    expect((await database.trainingSessions.get(sessionId))?.sessionDate).toBe(
      "2026-08-08",
    );
  });

  it("rechaza RPE y dolor fuera de rango", async () => {
    const sessionId = await trainingSessionRepository.create("2026-08-08");
    await expect(
      trainingSessionRepository.update(sessionId, { perceivedExertion: 11 }),
    ).rejects.toThrow();
    await expect(
      trainingSessionRepository.update(sessionId, { painLevel: -1 }),
    ).rejects.toThrow();
  });

  it("permite volver a dejar RPE y dolor sin valorar", async () => {
    const sessionId = await trainingSessionRepository.create("2026-08-08");
    await trainingSessionRepository.update(sessionId, {
      perceivedExertion: 7,
      painLevel: 3,
    });
    await trainingSessionRepository.update(sessionId, {
      perceivedExertion: undefined,
      painLevel: undefined,
    });
    const session = await database.trainingSessions.get(sessionId);
    expect(session).not.toHaveProperty("perceivedExertion");
    expect(session).not.toHaveProperty("painLevel");
  });

  it("rechaza métricas negativas y repeticiones decimales", async () => {
    const { movementId } = await createStrengthSession({
      setCount: 1,
      repetitions: 5,
    });
    const setRecord = (await getSortedSets(movementId))[0]!;
    await expect(
      trainingSessionRepository.updateSetMetric(
        setRecord.setRecordId,
        "weightKilograms",
        -5,
      ),
    ).rejects.toThrow();
    await expect(
      trainingSessionRepository.updateSetMetric(
        setRecord.setRecordId,
        "repetitions",
        2.5,
      ),
    ).rejects.toThrow();
    await expect(
      trainingSessionRepository.addRepeatedSets(movementId, 2, {
        repetitions: -1,
      }),
    ).rejects.toThrow();
    expect(await getSortedSets(movementId)).toHaveLength(1);
  });

  it("rechaza resultados WOD negativos o decimales donde van enteros", async () => {
    const sessionId = await trainingSessionRepository.create("2026-08-08");
    const blockId = await trainingSessionRepository.addBlock(sessionId, "wod");
    await expect(
      trainingSessionRepository.updateBlock(blockId, {
        wodConfiguration: { format: "amrap", scaling: "rx", rounds: -3 },
      }),
    ).rejects.toThrow();
    await expect(
      trainingSessionRepository.updateBlock(blockId, {
        wodConfiguration: { format: "amrap", scaling: "rx", rounds: 1.5 },
      }),
    ).rejects.toThrow();
  });

  it("rechaza grupos, materiales y métricas desconocidos en ejercicios personalizados", async () => {
    await expect(
      exerciseDefinitionRepository.createCustom({
        name: "Algo",
        englishAlias: "",
        muscleGroup: "yoga" as never,
        equipment: "barra",
        metrics: ["repetitions"],
      }),
    ).rejects.toThrow();
    await expect(
      exerciseDefinitionRepository.createCustom({
        name: "Algo",
        englishAlias: "",
        muscleGroup: "espalda",
        equipment: "elastico" as never,
        metrics: ["repetitions"],
      }),
    ).rejects.toThrow();
    await expect(
      exerciseDefinitionRepository.createCustom({
        name: "Algo",
        englishAlias: "",
        muscleGroup: "espalda",
        equipment: "barra",
        metrics: ["pasos" as never],
      }),
    ).rejects.toThrow();
  });

  it("propiedad: cualquier secuencia de escrituras produce una copia válida", async () => {
    const dateArbitrary = fc.oneof(
      fc.constant(""),
      fc.constant("2026-02-30"),
      fc.constant("abc"),
      fc
        .date({
          min: new Date("2020-01-01T00:00:00Z"),
          max: new Date("2030-12-31T00:00:00Z"),
          noInvalidDate: true,
        })
        .map((date) => date.toISOString().slice(0, 10)),
    );
    const numberArbitrary = fc.oneof(
      fc.constant(undefined),
      fc.double({ min: -500, max: 500, noNaN: true }),
      fc.integer({ min: -10, max: 400 }),
    );
    const metricArbitrary = fc.constantFrom(
      "repetitions",
      "weightKilograms",
      "durationSeconds",
      "distanceMeters",
      "calories",
    ) as fc.Arbitrary<
      | "repetitions"
      | "weightKilograms"
      | "durationSeconds"
      | "distanceMeters"
      | "calories"
    >;
    const operationArbitrary = fc.oneof(
      fc.record({ kind: fc.constant("date" as const), value: dateArbitrary }),
      fc.record({
        kind: fc.constant("wellbeing" as const),
        exertion: numberArbitrary,
        pain: numberArbitrary,
      }),
      fc.record({
        kind: fc.constant("metric" as const),
        metric: metricArbitrary,
        value: numberArbitrary,
      }),
      fc.record({
        kind: fc.constant("sets" as const),
        count: fc.integer({ min: -1, max: 22 }),
        repetitions: numberArbitrary,
        weight: numberArbitrary,
      }),
      fc.record({
        kind: fc.constant("wod" as const),
        rounds: numberArbitrary,
        duration: numberArbitrary,
      }),
      fc.record({
        kind: fc.constantFrom("lift" as const, "liftEdit" as const),
        weight: numberArbitrary,
        repetitions: numberArbitrary,
        date: fc.option(dateArbitrary, { nil: undefined }),
        notes: fc.option(fc.string({ maxLength: 300 }), { nil: undefined }),
      }),
      fc.constant({ kind: "liftRemove" as const }),
    );

    await fc.assert(
      fc.asyncProperty(
        fc.array(operationArbitrary, { minLength: 1, maxLength: 12 }),
        async (operations) => {
          await clearDatabase();
          await addTestExercise();
          const { sessionId, movementId } = await createStrengthSession({
            setCount: 1,
            repetitions: 1,
          });
          const wodId = await trainingSessionRepository.addBlock(
            sessionId,
            "wod",
          );
          for (const operation of operations) {
            const setRecord = (await getSortedSets(movementId))[0];
            switch (operation.kind) {
              case "date":
                await attempt(() =>
                  trainingSessionRepository.update(sessionId, {
                    sessionDate: operation.value,
                  }),
                );
                break;
              case "wellbeing":
                await attempt(() =>
                  trainingSessionRepository.update(sessionId, {
                    perceivedExertion: operation.exertion,
                    painLevel: operation.pain,
                  }),
                );
                break;
              case "metric":
                if (setRecord)
                  await attempt(() =>
                    trainingSessionRepository.updateSetMetric(
                      setRecord.setRecordId,
                      operation.metric,
                      operation.value,
                    ),
                  );
                break;
              case "sets":
                await attempt(() =>
                  trainingSessionRepository.addRepeatedSets(
                    movementId,
                    operation.count,
                    {
                      ...(operation.repetitions !== undefined
                        ? { repetitions: operation.repetitions }
                        : {}),
                      ...(operation.weight !== undefined
                        ? { weightKilograms: operation.weight }
                        : {}),
                    },
                  ),
                );
                break;
              case "wod":
                await attempt(() =>
                  trainingSessionRepository.updateBlock(wodId, {
                    wodConfiguration: {
                      format: "amrap",
                      scaling: "rx",
                      ...(operation.rounds !== undefined
                        ? { rounds: operation.rounds }
                        : {}),
                      ...(operation.duration !== undefined
                        ? { durationSeconds: operation.duration }
                        : {}),
                    },
                  }),
                );
                break;
              case "lift":
              case "liftEdit": {
                const input = {
                  exerciseDefinitionId: "test-deadlift",
                  weightKilograms: operation.weight ?? Number.NaN,
                  repetitions: operation.repetitions ?? Number.NaN,
                  ...(operation.date !== undefined
                    ? { recordDate: operation.date }
                    : {}),
                  ...(operation.notes !== undefined
                    ? { notes: operation.notes }
                    : {}),
                };
                const [existing] =
                  await knownLiftRepository.listByExercise("test-deadlift");
                if (operation.kind === "liftEdit" && existing)
                  await attempt(() =>
                    knownLiftRepository.update(existing.knownLiftId, input),
                  );
                else await attempt(() => knownLiftRepository.create(input));
                break;
              }
              case "liftRemove": {
                const [existing] =
                  await knownLiftRepository.listByExercise("test-deadlift");
                if (existing)
                  await knownLiftRepository.remove(existing.knownLiftId);
                break;
              }
            }
          }
          const backup: unknown = JSON.parse(
            JSON.stringify(await createBackup()),
          );
          expect(() => parseBackup(backup)).not.toThrow();
        },
      ),
      { numRuns: 60 },
    );
  });
});
