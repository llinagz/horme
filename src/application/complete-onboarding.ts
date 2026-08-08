import type { AthleteProfile, BodyMeasurement } from "@/domain/entities";
import { createUuid } from "@/domain/ids";
import { onboardingInputSchema } from "@/domain/validation";
import { database, initializeDatabase } from "@/infrastructure/database";

export async function completeOnboarding(input: unknown): Promise<void> {
  await initializeDatabase();
  const parsed = onboardingInputSchema.parse(input);
  const timestamp = new Date().toISOString();
  const profile: AthleteProfile = {
    athleteProfileId: createUuid(),
    displayName: parsed.displayName,
    onboardingCompletedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const measurement: BodyMeasurement = {
    bodyMeasurementId: createUuid(),
    measurementDate: parsed.measurementDate,
    heightCentimeters: parsed.heightCentimeters,
    weightKilograms: parsed.weightKilograms,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await database.transaction(
    "rw",
    [database.athleteProfiles, database.bodyMeasurements],
    async () => {
      await database.athleteProfiles.clear();
      await database.athleteProfiles.add(profile);
      await database.bodyMeasurements.add(measurement);
    },
  );
}
