#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDefaultProject() {
  console.log('🚀 Starting default project creation and data migration...');

  try {
    // Start a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // 1. Check if there are any existing projects
      const existingProjects = await tx.project.count();
      
      if (existingProjects > 0) {
        console.log(`✅ Found ${existingProjects} existing projects. Skipping default project creation.`);
        return;
      }

      // 2. Find the first user to be the project owner
      const firstUser = await tx.user.findFirst({
        orderBy: { createdAt: 'asc' }
      });

      if (!firstUser) {
        throw new Error('No users found in database. Please create a user first.');
      }

      console.log(`👤 Using user "${firstUser.name}" (${firstUser.email}) as default project owner`);

      // 3. Create the default project
      const defaultProject = await tx.project.create({
        data: {
          name: 'Default Project',
          description: 'Auto-generated default project for migrating existing test data',
          isActive: true,
          ownerId: firstUser.id,
        }
      });

      console.log(`📦 Created default project: "${defaultProject.name}" (ID: ${defaultProject.id})`);

      // 4. Since schema requires projectId to be NOT NULL, all existing data
      // should already have a projectId. This script is mainly for creating
      // the default project if it doesn't exist.

      // 5. Verify project data
      const finalCounts = {
        executions: await tx.execution.count({ where: { projectId: defaultProject.id } }),
        specs: await tx.spec.count({ where: { projectId: defaultProject.id } }),
        issues: await tx.issue.count({ where: { projectId: defaultProject.id } }),
        results: await tx.result.count({
          where: {
            execution: { projectId: defaultProject.id }
          }
        })
      };

      console.log(`\n📊 Data associated with default project:`);
      console.log(`  - Executions: ${finalCounts.executions}`);
      console.log(`  - Specs: ${finalCounts.specs}`);
      console.log(`  - Issues: ${finalCounts.issues}`);
      console.log(`  - Results: ${finalCounts.results}`);
    });

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
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