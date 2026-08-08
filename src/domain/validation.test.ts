import { describe, expect, it } from "vitest";
import {
  bodyMeasurementInputSchema,
  onboardingInputSchema,
  parseLocalizedNumber,
} from "./validation";

describe("validación del onboarding", () => {
  it("acepta coma y punto decimal", () => {
    expect(parseLocalizedNumber("75,5")).toBe(75.5);
    expect(parseLocalizedNumber("181.2")).toBe(181.2);
  });

  it("recorta el nombre y respeta los límites", () => {
    const result = onboardingInputSchema.parse({
      displayName: "  Javier  ",
      measurementDate: "2026-08-08",
      heightCentimeters: 181,
      weightKilograms: 78.4,
    });
    expect(result.displayName).toBe("Javier");
    expect(() =>
      onboardingInputSchema.parse({
        displayName: "",
        measurementDate: "2026-08-08",
        heightCentimeters: 99,
        weightKilograms: 20,
      }),
    ).toThrow();
  });
});

describe("validación de mediciones", () => {
  it("solo admite peso después del onboarding", () => {
    expect(
      bodyMeasurementInputSchema.parse({
        measurementDate: "2026-08-08",
        weightKilograms: 78.4,
      }),
    ).toEqual({ measurementDate: "2026-08-08", weightKilograms: 78.4 });
    expect(() =>
      bodyMeasurementInputSchema.parse({
        measurementDate: "2026-08-08",
        heightCentimeters: 181,
        weightKilograms: 78.4,
      }),
    ).toThrow();
  });
});
