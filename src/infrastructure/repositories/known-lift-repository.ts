import { sortKnownLifts } from "@/domain/calculations";
import type { KnownLift } from "@/domain/entities";
import { createUuid } from "@/domain/ids";
import { knownLiftInputSchema } from "@/domain/validation";
import { database, initializeDatabase } from "../database";

export type KnownLiftInput = Pick<
  KnownLift,
  "exerciseDefinitionId" | "weightKilograms" | "repetitions"
> &
  Partial<Pick<KnownLift, "recordDate" | "notes">>;

function withOptionalFields(parsed: {
  recordDate?: string | undefined;
  notes?: string | undefined;
}): Pick<KnownLift, "recordDate" | "notes"> {
  return {
    ...(parsed.recordDate !== undefined
      ? { recordDate: parsed.recordDate }
      : {}),
    ...(parsed.notes ? { notes: parsed.notes } : {}),
  };
}

export const knownLiftRepository = {
  async listByExercise(exerciseDefinitionId: string): Promise<KnownLift[]> {
    return sortKnownLifts(
      await database.knownLifts
        .where("exerciseDefinitionId")
        .equals(exerciseDefinitionId)
        .toArray(),
    );
  },

  async listAll(): Promise<Map<string, KnownLift[]>> {
    const byExercise = new Map<string, KnownLift[]>();
    for (const lift of await database.knownLifts.toArray()) {
      byExercise.set(lift.exerciseDefinitionId, [
        ...(byExercise.get(lift.exerciseDefinitionId) ?? []),
        lift,
      ]);
    }
    return new Map(
      [...byExercise].map(([exerciseDefinitionId, lifts]) => [
        exerciseDefinitionId,
        sortKnownLifts(lifts),
      ]),
    );
  },

  async create(input: KnownLiftInput): Promise<string> {
    await initializeDatabase();
    const parsed = knownLiftInputSchema.parse(input);
    const knownLiftId = createUuid();
    const timestamp = new Date().toISOString();
    await database.transaction(
      "rw",
      database.exerciseDefinitions,
      database.knownLifts,
      async () => {
        if (
          !(await database.exerciseDefinitions.get(parsed.exerciseDefinitionId))
        )
          throw new Error("El ejercicio ya no existe");
        await database.knownLifts.add({
          knownLiftId,
          exerciseDefinitionId: parsed.exerciseDefinitionId,
          weightKilograms: parsed.weightKilograms,
          repetitions: parsed.repetitions,
          ...withOptionalFields(parsed),
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      },
    );
    return knownLiftId;
  },

  async update(knownLiftId: string, input: KnownLiftInput): Promise<void> {
    await initializeDatabase();
    const parsed = knownLiftInputSchema.parse(input);
    const optional = withOptionalFields(parsed);
    const updated = await database.knownLifts
      .where("knownLiftId")
      .equals(knownLiftId)
      .modify((lift) => {
        lift.weightKilograms = parsed.weightKilograms;
        lift.repetitions = parsed.repetitions;
        if (optional.recordDate !== undefined)
          lift.recordDate = optional.recordDate;
        else delete lift.recordDate;
        if (optional.notes !== undefined) lift.notes = optional.notes;
        else delete lift.notes;
        lift.updatedAt = new Date().toISOString();
      });
    if (updated === 0) throw new Error("La marca ya no existe");
  },

  async remove(knownLiftId: string): Promise<void> {
    await initializeDatabase();
    await database.knownLifts.delete(knownLiftId);
  },
};
