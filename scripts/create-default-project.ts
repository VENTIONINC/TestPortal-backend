#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDefaultProject() {
  try {
    await prisma.$transaction(async (tx) => {
      // Check if Default Project exists
      const existingDefault = await tx.project.findFirst({
        where: { name: 'Default Project' }
      });

      if (existingDefault) {
        // Migrate any orphaned data
        try {
          await tx.$executeRaw`UPDATE "Execution" SET "projectId" = ${existingDefault.id} WHERE "projectId" IS NULL`;
          await tx.$executeRaw`UPDATE "Spec" SET "projectId" = ${existingDefault.id} WHERE "projectId" IS NULL`;
          await tx.$executeRaw`UPDATE "Issue" SET "projectId" = ${existingDefault.id} WHERE "projectId" IS NULL`;
        } catch {
          // Schema might enforce NOT NULL already
        }
        return;
      }

      // Find first user
      const firstUser = await tx.user.findFirst({
        orderBy: { createdAt: 'asc' }
      });

      if (!firstUser) {
        throw new Error('No users found in database. Please create a user first.');
      }

      // Create default project
      const defaultProject = await tx.project.create({
        data: {
          name: 'Default Project',
          description: 'Auto-generated default project for migrating existing test data',
          isActive: true,
          ownerId: firstUser.id,
        }
      });

      // Migrate all existing data
      try {
        await tx.$executeRaw`UPDATE "Execution" SET "projectId" = ${defaultProject.id} WHERE "projectId" IS NULL`;
        await tx.$executeRaw`UPDATE "Spec" SET "projectId" = ${defaultProject.id} WHERE "projectId" IS NULL`;
        await tx.$executeRaw`UPDATE "Issue" SET "projectId" = ${defaultProject.id} WHERE "projectId" IS NULL`;
      } catch {
        // Columns might not exist yet
      }
    });

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createDefaultProject();
}

export { createDefaultProject };