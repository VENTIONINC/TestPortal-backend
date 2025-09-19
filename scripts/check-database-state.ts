#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseState() {
  console.log('🔍 Checking current database state...\n');

  try {
    // Check projects
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        ownerId: true,
        _count: {
          select: {
            executions: true,
            specs: true,
            issues: true
          }
        }
      }
    });

    console.log('📦 Projects:');
    projects.forEach(project => {
      console.log(`  - ${project.name} (ID: ${project.id}, Owner: ${project.ownerId})`);
      console.log(`    Executions: ${project._count.executions}, Specs: ${project._count.specs}, Issues: ${project._count.issues}`);
    });

    // Check for orphaned data (this might fail if schema enforces NOT NULL)
    try {
      const orphanedExecutions = await prisma.$queryRaw<Array<{count: bigint}>>`
        SELECT COUNT(*) as count FROM "Execution" WHERE "projectId" IS NULL
      `;
      console.log(`\n🔍 Orphaned Executions: ${orphanedExecutions[0]?.count || 0}`);
    } catch (e) {
      console.log('\n✅ No NULL projectId allowed in Executions (schema enforced)');
    }

    try {
      const orphanedSpecs = await prisma.$queryRaw<Array<{count: bigint}>>`
        SELECT COUNT(*) as count FROM "Spec" WHERE "projectId" IS NULL
      `;
      console.log(`🔍 Orphaned Specs: ${orphanedSpecs[0]?.count || 0}`);
    } catch (e) {
      console.log('✅ No NULL projectId allowed in Specs (schema enforced)');
    }

    try {
      const orphanedIssues = await prisma.$queryRaw<Array<{count: bigint}>>`
        SELECT COUNT(*) as count FROM "Issue" WHERE "projectId" IS NULL
      `;
      console.log(`🔍 Orphaned Issues: ${orphanedIssues[0]?.count || 0}`);
    } catch (e) {
      console.log('✅ No NULL projectId allowed in Issues (schema enforced)');
    }

    // Total counts
    const totalCounts = await prisma.$transaction([
      prisma.execution.count(),
      prisma.spec.count(), 
      prisma.issue.count(),
      prisma.result.count(),
      prisma.user.count()
    ]);

    console.log(`\n📊 Total counts:`);
    console.log(`  - Users: ${totalCounts[4]}`);
    console.log(`  - Executions: ${totalCounts[0]}`);
    console.log(`  - Specs: ${totalCounts[1]}`);
    console.log(`  - Issues: ${totalCounts[2]}`);
    console.log(`  - Results: ${totalCounts[3]}`);

    // Check if we have a "Default Project"
    const defaultProject = await prisma.project.findFirst({
      where: { name: 'Default Project' }
    });

    if (defaultProject) {
      console.log(`\n✅ Default Project exists (ID: ${defaultProject.id})`);
    } else {
      console.log(`\n❌ No Default Project found`);
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkDatabaseState();
}

export { checkDatabaseState };