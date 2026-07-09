import { dbClient } from "@/prisma/client";
import { skillPackageSeedService } from "@/services/skillPackageSeedService";

async function main(): Promise<void> {
  const result = await skillPackageSeedService.seed();
  console.log(`Seeded ${result.seededSkillNames.length} skill packages.`);
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed skill packages", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbClient.$disconnect();
  });
