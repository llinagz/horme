"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { athleteProfileRepository } from "@/infrastructure/repositories/athlete-profile-repository";
import { bodyMeasurementRepository } from "@/infrastructure/repositories/body-measurement-repository";
import { knownLiftRepository } from "@/infrastructure/repositories/known-lift-repository";

export function useAthleteProfile() {
  return useLiveQuery(
    async () => (await athleteProfileRepository.get()) ?? null,
    [],
  );
}

export function useKnownLifts(exerciseDefinitionId: string) {
  return useLiveQuery(
    () => knownLiftRepository.listByExercise(exerciseDefinitionId),
    [exerciseDefinitionId],
  );
}

export function useBodyMeasurements() {
  return useLiveQuery(() => bodyMeasurementRepository.list(), [], []);
}
