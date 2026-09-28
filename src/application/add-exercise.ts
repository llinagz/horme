import type { SetRecord } from "@/domain/entities";
import { pickDefined } from "@/domain/collections";
import {
  trainingSessionRepository,
  type SetValues,
} from "@/infrastructure/repositories/training-session-repository";

const setValueKeys = [
  "repetitions",
  "weightKilograms",
  "durationSeconds",
  "distanceMeters",
  "calories",
] as const;

function valuesOf(setRecord: SetRecord): SetValues {
  return pickDefined(setRecord, setValueKeys);
}

/**
 * Añade un ejercicio al bloque con las mismas series que la última vez que se
 * hizo, para empezar desde la marca anterior. Sin historial crea tres series
 * vacías.
 */
export async function addExerciseToBlock(
  trainingBlockId: string,
  exerciseDefinitionId: string,
  trainingSessionId: string,
): Promise<string> {
  const previous = await trainingSessionRepository.getLastExerciseEntry(
    exerciseDefinitionId,
    trainingSessionId,
  );
  const movementId = await trainingSessionRepository.addMovement(
    trainingBlockId,
    exerciseDefinitionId,
  );
  const previousValues = (previous?.sets ?? []).slice(0, 20).map(valuesOf);
  await trainingSessionRepository.addSets(
    movementId,
    previousValues.length > 0 ? previousValues : [{}, {}, {}],
  );
  return movementId;
}
