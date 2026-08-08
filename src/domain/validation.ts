import { z } from "zod";
import { isLocalDate } from "./dates";

export function parseLocalizedNumber(value: string): number | undefined {
  const normalized = value.trim().replace(",", ".");
  if (normalized.length === 0) return undefined;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : undefined;
}

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Escribe tu nombre")
  .max(50, "El nombre no puede superar 50 caracteres");
export const heightCentimetersSchema = z
  .number()
  .min(100, "La altura mínima es 100 cm")
  .max(250, "La altura máxima es 250 cm");
export const weightKilogramsSchema = z
  .number()
  .min(30, "El peso mínimo es 30 kg")
  .max(350, "El peso máximo es 350 kg");
export const localDateSchema = z
  .string()
  .refine(isLocalDate, "La fecha no es válida");

export const onboardingInputSchema = z.object({
  displayName: displayNameSchema,
  measurementDate: localDateSchema,
  heightCentimeters: heightCentimetersSchema,
  weightKilograms: weightKilogramsSchema,
});

export const bodyMeasurementInputSchema = z.strictObject({
  measurementDate: localDateSchema,
  weightKilograms: weightKilogramsSchema,
});
