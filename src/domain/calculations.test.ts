import { describe, expect, it } from "vitest";
import {
  calculateEstimatedOneRepMax,
  calculateSessionVolume,
  getCurrentBodyValues,
  summarizeExercisePerformance,
} from "./calculations";
import type { BodyMeasurement, SetRecord } from "./entities";

const timestamp = "2026-08-08T10:00:00.000Z";

function createSet(overrides: Partial<SetRecord>): SetRecord {
  return {
    setRecordId: crypto.randomUUID(),
    exerciseMovementId: crypto.randomUUID(),
    position: 0,
    isCompleted: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe("cálculos de progreso", () => {
  it("usa la carga real para una repetición y Epley de 2 a 10", () => {
    expect(calculateEstimatedOneRepMax(1, 115)).toBe(115);
    expect(calculateEstimatedOneRepMax(5, 100)).toBeCloseTo(116.67, 2);
    expect(calculateEstimatedOneRepMax(11, 100)).toBeUndefined();
  });

  it("excluye del volumen las series incompletas o sin carga", () => {
    const sets = [
      createSet({ repetitions: 3, weightKilograms: 100 }),
      createSet({ repetitions: 5, weightKilograms: 50, isCompleted: false }),
      createSet({ repetitions: 10 }),
    ];
    expect(calculateSessionVolume(sets)).toBe(300);
    expect(summarizeExercisePerformance(sets)).toMatchObject({
      maximumActualWeightKilograms: 100,
      totalVolumeKilograms: 300,
      completedSetCount: 2,
    });
  });
});

describe("valores corporales actuales", () => {
  it("elige por fecha la última altura y el último peso por separado", () => {
    const measurements: BodyMeasurement[] = [
      {
        bodyMeasurementId: crypto.randomUUID(),
        measurementDate: "2026-08-08",
        weightKilograms: 78,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        bodyMeasurementId: crypto.randomUUID(),
        measurementDate: "2025-12-01",
        heightCentimeters: 181,
        weightKilograms: 80,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        bodyMeasurementId: crypto.randomUUID(),
        measurementDate: "2026-05-20",
        heightCentimeters: 182,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];
    expect(getCurrentBodyValues(measurements)).toEqual({
      heightCentimeters: 182,
      weightKilograms: 78,
    });
  });
});
