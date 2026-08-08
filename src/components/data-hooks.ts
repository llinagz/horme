"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { athleteProfileRepository } from "@/infrastructure/repositories/athlete-profile-repository";
import { bodyMeasurementRepository } from "@/infrastructure/repositories/body-measurement-repository";

export function useAthleteProfile() {
  return useLiveQuery(
    async () => (await athleteProfileRepository.get()) ?? null,
    [],
  );
}

export function useBodyMeasurements() {
  return useLiveQuery(() => bodyMeasurementRepository.list(), [], []);
}
