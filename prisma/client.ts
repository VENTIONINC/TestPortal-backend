import { PrismaClient } from "@prisma/client";
import getLogger from "@/lib/logger";

function runClient(): PrismaClient {
  const logger = getLogger();
  const client = new PrismaClient();
  logger.debug("sqlite STARTED");
  return client;
}

/*
async function _clearDatabase(): Promise<void> {
    try {
        const client = new PrismaClient();
        await client.assumption.deleteMany();
        await client.result.deleteMany();
        await client.issue.deleteMany();
        await client.spec.deleteMany();
        await client.execution.deleteMany();
        await client.resultError.deleteMany();

        console.log('All records deleted successfully.');
    } catch (error) {
        console.error('Error deleting records:', error);
    }
}
*/

export const dbClient: PrismaClient = runClient();
