import { z } from "zod";

/** Mensaje legible para el usuario a partir de cualquier error lanzado. */
export function getErrorMessage(
  error: unknown,
  fallback = "No se ha podido guardar",
): string {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message ?? "Revisa los datos";
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
