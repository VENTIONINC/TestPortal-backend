import { PrismaClient } from "@prisma/client";

function runClient(): PrismaClient {
  const client = new PrismaClient();
  return client;
}

export const dbClient: PrismaClient = runClient();
