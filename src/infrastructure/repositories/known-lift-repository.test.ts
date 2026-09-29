import { beforeEach, describe, expect, it } from "vitest";
import { addTestExercise, clearDatabase } from "@/test/database-helpers";
import { database } from "../database";
import { knownLiftRepository } from "./known-lift-repository";

beforeEach(async () => {
  await clearDatabase();
  await addTestExercise();
});

describe("marcas registradas", () => {
  it("crea una marca con fecha y nota y la lista por ejercicio", async () => {
    const id = await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 100,
      repetitions: 5,
      recordDate: "2026-07-01",
      notes: "  Con cinturón ",
    });

    expect(
      await knownLiftRepository.listByExercise("test-deadlift"),
    ).toMatchObject([
      {
        knownLiftId: id,
        weightKilograms: 100,
        repetitions: 5,
        recordDate: "2026-07-01",
        notes: "Con cinturón",
      },
    ]);
  });

  it("guarda una marca sin fecha y la ordena después de las fechadas", async () => {
    const undated = await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 120,
      repetitions: 1,
    });
    const older = await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 100,
      repetitions: 5,
      recordDate: "2026-05-01",
    });
    const newer = await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 110,
      repetitions: 3,
      recordDate: "2026-07-01",
    });

    const lifts = await knownLiftRepository.listByExercise("test-deadlift");
    expect(lifts.map((lift) => lift.knownLiftId)).toEqual([
      newer,
      older,
      undated,
    ]);
    expect(lifts[2]).not.toHaveProperty("recordDate");
  });

  it("agrupa todas las marcas por ejercicio", async () => {
    await addTestExercise({ exerciseDefinitionId: "test-squat" });
    await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 100,
      repetitions: 5,
    });
    await knownLiftRepository.create({
      exerciseDefinitionId: "test-squat",
      weightKilograms: 80,
      repetitions: 8,
    });

    const all = await knownLiftRepository.listAll();
    expect([...all.keys()].toSorted()).toEqual(["test-deadlift", "test-squat"]);
  });

  it("valida el peso, las repeticiones y la fecha con mensajes en español", async () => {
    const base = { exerciseDefinitionId: "test-deadlift" };
    await expect(
      knownLiftRepository.create({
        ...base,
        weightKilograms: 0,
        repetitions: 5,
      }),
    ).rejects.toThrow("El peso debe ser mayor que 0");
    await expect(
      knownLiftRepository.create({
        ...base,
        weightKilograms: 501,
        repetitions: 5,
      }),
    ).rejects.toThrow("El peso máximo es 500 kg");
    await expect(
      knownLiftRepository.create({
        ...base,
        weightKilograms: 100,
        repetitions: 2.5,
      }),
    ).rejects.toThrow("Las repeticiones deben ser un número entero");
    await expect(
      knownLiftRepository.create({
        ...base,
        weightKilograms: 100,
        repetitions: 5,
        recordDate: "2026-13-45",
      }),
    ).rejects.toThrow("La fecha no es válida");
    expect(await database.knownLifts.count()).toBe(0);
  });

  it("rechaza una marca de un ejercicio que no existe", async () => {
    await expect(
      knownLiftRepository.create({
        exerciseDefinitionId: "no-existe",
        weightKilograms: 100,
        repetitions: 5,
      }),
    ).rejects.toThrow("El ejercicio ya no existe");
  });

  it("edita una marca y permite quitarle la fecha", async () => {
    const id = await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 100,
      repetitions: 5,
      recordDate: "2026-07-01",
      notes: "Antigua",
    });

    await knownLiftRepository.update(id, {
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 105,
      repetitions: 4,
    });

    const [lift] = await knownLiftRepository.listByExercise("test-deadlift");
    expect(lift).toMatchObject({ weightKilograms: 105, repetitions: 4 });
    expect(lift).not.toHaveProperty("recordDate");
    expect(lift).not.toHaveProperty("notes");
  });

  it("avisa al editar una marca que ya no existe", async () => {
    await expect(
      knownLiftRepository.update("no-existe", {
        exerciseDefinitionId: "test-deadlift",
        weightKilograms: 100,
        repetitions: 5,
      }),
    ).rejects.toThrow("La marca ya no existe");
  });

  it("elimina una marca", async () => {
    const id = await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 100,
      repetitions: 5,
    });
    await knownLiftRepository.remove(id);
    expect(await knownLiftRepository.listByExercise("test-deadlift")).toEqual(
      [],
    );
  });
});
