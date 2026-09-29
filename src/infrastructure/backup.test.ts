import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completeOnboarding } from "@/application/complete-onboarding";
import {
  addTestExercise,
  clearDatabase,
  createStrengthSession,
} from "@/test/database-helpers";
import {
  createBackup,
  getBackupFileName,
  getBackupStatus,
  markBackupCreated,
  parseBackup,
  previewBackup,
  replaceDatabaseFromBackup,
} from "./backup";
import { database } from "./database";
import { knownLiftRepository } from "./repositories/known-lift-repository";
import { trainingSessionRepository } from "./repositories/training-session-repository";

async function seed(): Promise<void> {
  await completeOnboarding({
    displayName: "Javier",
    measurementDate: "2026-08-08",
    heightCentimeters: 181,
    weightKilograms: 78,
  });
  await addTestExercise();
  await createStrengthSession({
    sessionDate: "2026-08-01",
    setCount: 2,
    repetitions: 5,
    weightKilograms: 100,
  });
  await knownLiftRepository.create({
    exerciseDefinitionId: "test-deadlift",
    weightKilograms: 140,
    repetitions: 3,
  });
  const sessionId = await trainingSessionRepository.create("2026-08-09");
  const wodId = await trainingSessionRepository.addBlock(sessionId, "wod");
  await trainingSessionRepository.updateBlock(wodId, {
    wodConfiguration: {
      name: "Cindy",
      format: "amrap",
      scaling: "scaled",
      durationSeconds: 1200,
      rounds: 14,
      additionalRepetitions: 3,
    },
  });
}

/** Colecciones como las de una copia anterior a las marcas registradas. */
function withoutKnownLifts(
  collections: Awaited<ReturnType<typeof createBackup>>["collections"],
): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...collections };
  delete rest.knownLifts;
  return rest;
}

beforeEach(clearDatabase);
afterEach(() => {
  vi.useRealTimers();
});

describe("copias", () => {
  it("ida y vuelta conserva exactamente todas las colecciones", async () => {
    await seed();
    const backup = await createBackup();
    const serialized: unknown = JSON.parse(JSON.stringify(backup));

    await clearDatabase();
    await replaceDatabaseFromBackup(serialized);

    const restored = await createBackup();
    // Tras restaurar se reponen los ejercicios integrados que la copia no
    // traía; todo lo que sí traía tiene que quedar exactamente igual.
    expect({
      ...restored.collections,
      exerciseDefinitions: [],
    }).toEqual({ ...backup.collections, exerciseDefinitions: [] });
    expect(restored.collections.exerciseDefinitions).toEqual(
      expect.arrayContaining(backup.collections.exerciseDefinitions),
    );
  });

  it("exporta con la versión 3, que incluye las marcas registradas", async () => {
    await seed();
    const backup = await createBackup();
    expect(backup.schemaVersion).toBe(3);
    expect(backup.collections.exerciseDefinitions[0]).toHaveProperty(
      "muscleGroup",
    );
    expect(backup.collections.knownLifts).toMatchObject([
      { exerciseDefinitionId: "test-deadlift", weightKilograms: 140 },
    ]);
  });

  it("restaura una copia v2 anterior a las marcas registradas", async () => {
    await seed();
    const current = await createBackup();
    const v2 = {
      ...current,
      schemaVersion: 2,
      collections: withoutKnownLifts(current.collections),
    };

    expect(parseBackup(v2)).toMatchObject({
      schemaVersion: 3,
      collections: { knownLifts: [] },
    });
    await clearDatabase();
    await replaceDatabaseFromBackup(v2);
    expect(await database.knownLifts.count()).toBe(0);
    expect(await database.trainingSessions.count()).toBe(2);
  });

  it("rechaza una v2 con marcas y una v3 sin ellas", async () => {
    await seed();
    const backup = await createBackup();
    expect(() => parseBackup({ ...backup, schemaVersion: 2 })).toThrow();
    expect(() =>
      parseBackup({
        ...backup,
        collections: withoutKnownLifts(backup.collections),
      }),
    ).toThrow();
  });

  it("rechaza una marca de un ejercicio que no está en la copia", async () => {
    await seed();
    const backup = await createBackup();
    expect(() =>
      parseBackup({
        ...backup,
        collections: {
          ...backup.collections,
          knownLifts: backup.collections.knownLifts.map((lift) => ({
            ...lift,
            exerciseDefinitionId: "no-existe",
          })),
        },
      }),
    ).toThrow("Hay marcas sin un ejercicio válido");
  });

  it("restaura una copia v1 anterior a los grupos musculares", async () => {
    await seed();
    const backup = await createBackup();
    const current = {
      ...backup,
      collections: withoutKnownLifts(backup.collections),
    };
    const legacy = {
      ...current,
      schemaVersion: 1,
      collections: {
        ...current.collections,
        exerciseDefinitions: [
          {
            exerciseDefinitionId: "built-in-003",
            name: "Peso muerto",
            englishAlias: "Deadlift",
            category: "fuerza-halterofilia",
            metrics: ["repetitions", "weightKilograms"],
            origin: "built-in",
            isArchived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            exerciseDefinitionId: "custom-1",
            name: "Remo en TRX",
            englishAlias: "",
            category: "gimnasia",
            metrics: ["repetitions"],
            origin: "custom",
            isArchived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        exerciseMovements: [],
        setRecords: [],
      },
    };

    const parsed = parseBackup(legacy);
    expect(parsed.schemaVersion).toBe(3);
    expect(parsed.collections.knownLifts).toEqual([]);
    expect(parsed.collections.exerciseDefinitions).toMatchObject([
      {
        name: "Peso muerto convencional",
        muscleGroup: "espalda",
        equipment: "barra",
      },
      {
        name: "Remo en TRX",
        muscleGroup: "cuerpo-completo",
        equipment: "peso-corporal",
      },
    ]);

    await clearDatabase();
    await replaceDatabaseFromBackup(legacy);
    // Los ejercicios que la copia no traía se reponen desde el catálogo.
    expect(
      await database.exerciseDefinitions.get("built-in-065"),
    ).toMatchObject({ name: "Curl de bíceps con mancuerna" });
    expect(
      await database.exerciseDefinitions.get("built-in-003"),
    ).toMatchObject({
      muscleGroup: "espalda",
      secondaryMuscleGroups: ["isquios", "gluteos"],
    });
  });

  it("rechaza una copia v2 sin la clasificación de los ejercicios", async () => {
    await seed();
    const backup = await createBackup();
    const withoutGroup: Record<string, unknown> = {
      ...backup.collections.exerciseDefinitions[0]!,
    };
    delete withoutGroup.muscleGroup;
    expect(() =>
      parseBackup({
        ...backup,
        collections: {
          ...backup.collections,
          exerciseDefinitions: [withoutGroup],
        },
      }),
    ).toThrow();
  });

  it("resume la copia antes de restaurar", async () => {
    await seed();
    const preview = previewBackup(await createBackup());
    expect(preview).toMatchObject({
      displayName: "Javier",
      sessionCount: 2,
      measurementCount: 1,
      knownLiftCount: 1,
      firstSessionDate: "2026-08-01",
      lastSessionDate: "2026-08-09",
    });
  });

  it("rechaza formato, versión, campos extra y datos que no son copias", async () => {
    await seed();
    const backup = await createBackup();
    expect(() => parseBackup({ ...backup, format: "otra-app" })).toThrow();
    expect(() => parseBackup({ ...backup, schemaVersion: 4 })).toThrow();
    expect(() => parseBackup({ ...backup, extra: true })).toThrow();
    expect(() =>
      parseBackup({
        ...backup,
        collections: {
          ...backup.collections,
          trainingSessions: backup.collections.trainingSessions.map(
            (session) => ({ ...session, unexpected: 1 }),
          ),
        },
      }),
    ).toThrow();
    expect(() => parseBackup(null)).toThrow();
    expect(() => parseBackup("{}")).toThrow();
  });

  it("rechaza identificadores duplicados", async () => {
    await seed();
    const backup = await createBackup();
    const session = backup.collections.trainingSessions[0]!;
    expect(() =>
      parseBackup({
        ...backup,
        collections: {
          ...backup.collections,
          trainingSessions: [...backup.collections.trainingSessions, session],
        },
      }),
    ).toThrow("identificadores duplicados");
  });

  it("nombra el archivo con la fecha local", () => {
    expect(getBackupFileName(new Date(2026, 8, 3, 23, 30))).toBe(
      "horme-backup-2026-09-03.json",
    );
  });
});

describe("recordatorio de copia", () => {
  it("no recuerda nada sin sesiones y avisa si nunca se ha hecho copia", async () => {
    expect(await getBackupStatus()).toEqual({ shouldRemind: false });
    await trainingSessionRepository.create("2026-08-08");
    expect(await getBackupStatus()).toMatchObject({
      shouldRemind: true,
      reason: "Todavía no has creado una copia",
    });
  });

  it("avisa tras cinco sesiones nuevas", async () => {
    await markBackupCreated(new Date().toISOString());
    expect((await getBackupStatus()).shouldRemind).toBe(false);
    for (let index = 0; index < 5; index += 1)
      await trainingSessionRepository.create("2026-08-08");
    expect(await getBackupStatus()).toMatchObject({
      shouldRemind: true,
      reason: "Has registrado cinco sesiones desde la última copia",
    });
  });

  it("avisa tras catorce días", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-01T10:00:00Z"));
    await markBackupCreated(new Date().toISOString());
    vi.setSystemTime(new Date("2026-08-15T10:00:00Z"));
    expect(await getBackupStatus()).toMatchObject({
      shouldRemind: true,
      reason: "Han pasado 14 días desde la última copia",
    });
  });

  it("guarda el número de sesiones en el momento de la copia", async () => {
    await trainingSessionRepository.create("2026-08-08");
    await markBackupCreated("2026-08-08T10:00:00.000Z");
    expect(
      await database.applicationMetadata.get("sessionCountAtLastBackup"),
    ).toMatchObject({ value: "1" });
  });
});
