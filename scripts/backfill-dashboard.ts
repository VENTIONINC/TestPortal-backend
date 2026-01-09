import { dbClient } from "@/prisma/client";
import { dashboardService } from "@/services/dashboardService";
import getLogger from "@/lib/logger";

// Initialize logger
const logger = getLogger("backfill-dashboard");

async function main() {
  logger.info("Starting dashboard backfill...");

  // 0. Clean up existing dashboard stats to prevent double counting
  logger.info("Clearing existing dashboard_stats_* keys...");
  const deleteResult = await dbClient.projectMeta.deleteMany({
    where: {
      key: {
        startsWith: "dashboard_stats_",
      },
    },
  });
  logger.info(`Deleted ${deleteResult.count} existing dashboard meta records.`);

  // 1. Get all executions
  // Process in chunks to avoid memory issues
  const pageSize = 50;
  let skip = 0;
  let processed = 0;

  while (true) {
    const executions = await dbClient.execution.findMany({
      take: pageSize,
      skip: skip,
      orderBy: { createdAt: "asc" }, // Oldest first
    });

    if (executions.length === 0) {
      break;
    }

    logger.info(`Processing batch: ${skip} - ${skip + executions.length}`);

    for (const execution of executions) {
      try {
        await dashboardService.updateStats(execution.id, execution.projectId);
        processed++;
      } catch (error) {
        logger.error(`Failed to process execution ${execution.id}`, error);
      }
    }

    skip += pageSize;
  }

  logger.info(`Backfill complete. Processed ${processed} executions.`);
}

main()
  .catch((e) => {
    logger.error("Backfill failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await dbClient.$disconnect();
  });
