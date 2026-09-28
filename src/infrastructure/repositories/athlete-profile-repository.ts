import { displayNameSchema } from "@/domain/validation";
import type { AthleteProfile } from "@/domain/entities";
import { database, initializeDatabase } from "../database";

export const athleteProfileRepository = {
  async get(): Promise<AthleteProfile | undefined> {
    return database.athleteProfiles.toCollection().first();
  },

  async updateDisplayName(displayName: string): Promise<void> {
    await initializeDatabase();
    const parsed = displayNameSchema.parse(displayName);
    await database.transaction("rw", database.athleteProfiles, async () => {
      const profile = await database.athleteProfiles.toCollection().first();
      if (!profile) throw new Error("Completa primero el perfil");
      await database.athleteProfiles.update(profile.athleteProfileId, {
        displayName: parsed,
        updatedAt: new Date().toISOString(),
      });
    });
  },
};
