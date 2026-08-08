import { displayNameSchema } from "@/domain/validation";
import type { AthleteProfile } from "@/domain/entities";
import { database, initializeDatabase } from "../database";

export const athleteProfileRepository = {
  async get(): Promise<AthleteProfile | undefined> {
    await initializeDatabase();
    return database.athleteProfiles.toCollection().first();
  },

  async updateDisplayName(displayName: string): Promise<void> {
    await initializeDatabase();
    const profile = await database.athleteProfiles.toCollection().first();
    if (!profile) throw new Error("Completa primero el perfil");
    await database.athleteProfiles.update(profile.athleteProfileId, {
      displayName: displayNameSchema.parse(displayName),
      updatedAt: new Date().toISOString(),
    });
  },
};
