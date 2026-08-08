import { getCurrentBodyValues } from "@/domain/calculations";
import type { BodyMeasurement } from "@/domain/entities";
import { createUuid } from "@/domain/ids";
import { bodyMeasurementInputSchema } from "@/domain/validation";
import { database, initializeDatabase } from "../database";

export type BodyMeasurementInput = Pick<
  BodyMeasurement,
  "measurementDate" | "weightKilograms"
>;

export const bodyMeasurementRepository = {
  async list(): Promise<BodyMeasurement[]> {
    await initializeDatabase();
    return (await database.bodyMeasurements.toArray()).toSorted(
      (left, right) =>
        left.measurementDate.localeCompare(right.measurementDate) ||
        left.createdAt.localeCompare(right.createdAt),
    );
  },

  async create(input: BodyMeasurementInput): Promise<string> {
    await initializeDatabase();
    const parsed = bodyMeasurementInputSchema.parse(input);
    const timestamp = new Date().toISOString();
    const bodyMeasurementId = createUuid();
    const measurement: BodyMeasurement = {
      bodyMeasurementId,
      measurementDate: parsed.measurementDate,
      weightKilograms: parsed.weightKilograms,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await database.bodyMeasurements.add(measurement);
    return bodyMeasurementId;
  },

  async update(
    bodyMeasurementId: string,
    input: BodyMeasurementInput,
  ): Promise<void> {
    await initializeDatabase();
    const parsed = bodyMeasurementInputSchema.parse(input);
    const updated = await database.bodyMeasurements
      .where("bodyMeasurementId")
      .equals(bodyMeasurementId)
      .modify((measurement) => {
        measurement.measurementDate = parsed.measurementDate;
        measurement.updatedAt = new Date().toISOString();
        measurement.weightKilograms = parsed.weightKilograms;
      });
    if (updated === 0) throw new Error("La medición ya no existe");
  },

  async remove(bodyMeasurementId: string): Promise<void> {
    await initializeDatabase();
    await database.transaction("rw", database.bodyMeasurements, async () => {
      const remaining = (await database.bodyMeasurements.toArray()).filter(
        (measurement) => measurement.bodyMeasurementId !== bodyMeasurementId,
      );
      const current = getCurrentBodyValues(remaining);
      if (
        current.heightCentimeters === undefined ||
        current.weightKilograms === undefined
      ) {
        throw new Error(
          "No puedes eliminar la última altura o el último peso disponible",
        );
      }
      await database.bodyMeasurements.delete(bodyMeasurementId);
    });
  },
};
