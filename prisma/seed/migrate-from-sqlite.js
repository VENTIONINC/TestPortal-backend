import { PrismaClient } from '@prisma/client';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const prisma = new PrismaClient();

// Create SQLite connection
const db = new sqlite3.Database('prisma/dev.db');
const dbAll = promisify(db.all.bind(db));
const dbClose = promisify(db.close.bind(db));

async function migrateSQLiteToPostgres() {
  console.log('🚀 Starting migration from SQLite to PostgreSQL...');

  try {
    // Clear existing data in reverse order of dependencies
    console.log('🧹 Clearing existing PostgreSQL data...');
    await prisma.assumption.deleteMany({});
    await prisma.issue.deleteMany({});
    await prisma.resultError.deleteMany({});
    await prisma.result.deleteMany({});
    await prisma.spec.deleteMany({});
    await prisma.execution.deleteMany({});

    // 1. Migrate Issues first (no dependencies)
    console.log('📋 Migrating Issues...');
    const issues = await dbAll('SELECT * FROM Issue ORDER BY id');
    for (const issue of issues) {
      await prisma.issue.create({
        data: {
          id: issue.id,
          createdAt: new Date(issue.createdAt),
          updatedAt: new Date(issue.updatedAt),
          name: issue.name,
          description: issue.description,
          portal: issue.portal,
          service: issue.service,
          ticket: issue.ticket,
          createdById: null,
          updatedById: null,
        },
      });
    }
    console.log(`✅ Migrated ${issues.length} issues`);

    // 2. Migrate Executions (no dependencies)
    console.log('⚡ Migrating Executions...');
    const executions = await dbAll('SELECT * FROM Execution ORDER BY id');
    for (const execution of executions) {
      await prisma.execution.create({
        data: {
          id: execution.id,
          createdAt: new Date(execution.createdAt),
          updatedAt: new Date(execution.updatedAt),
          type: execution.type,
          name: execution.name,
          environment: execution.environment,
          version: execution.version,
          startedAt: new Date(execution.startedAt),
        },
      });
    }
    console.log(`✅ Migrated ${executions.length} executions`);

    // 3. Migrate Specs (no dependencies)
    console.log('📝 Migrating Specs...');
    const specs = await dbAll('SELECT * FROM Spec ORDER BY id');
    for (const spec of specs) {
      await prisma.spec.create({
        data: {
          id: spec.id,
          createdAt: new Date(spec.createdAt),
          updatedAt: new Date(spec.updatedAt),
          key: spec.key,
          file: spec.file,
          title: spec.title,
          tags: spec.tags,
          annotations: spec.annotations,
        },
      });
    }
    console.log(`✅ Migrated ${specs.length} specs`);

    // 4. Migrate Results (depends on Spec and Execution)
    console.log('📊 Migrating Results...');
    const results = await dbAll('SELECT * FROM Result ORDER BY id');
    for (const result of results) {
      await prisma.result.create({
        data: {
          id: result.id,
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt),
          reportPortalLink: result.allureLink,
          retry: result.retry,
          status: result.status,
          duration: result.duration,
          startTime: new Date(result.startTime),
          specId: result.specId,
          executionId: result.executionId,
          analysisStatus: null,
          analysisCategory: null,
          analysisConfidence: null,
          analysisConclusion: null,
        },
      });
    }
    console.log(`✅ Migrated ${results.length} results`);

    // 5. Migrate ResultErrors (depends on Result)
    console.log('❌ Migrating Result Errors...');
    const resultErrors = await dbAll('SELECT * FROM ResultError ORDER BY id');
    for (const error of resultErrors) {
      await prisma.resultError.create({
        data: {
          id: error.id,
          createdAt: new Date(error.createdAt),
          updatedAt: new Date(error.updatedAt),
          type: error.type,
          message: error.message,
          callLog: error.callLog,
          callStack: error.callStack,
          testAssertion: error.testAssertion,
          expectedPattern: error.expectedPattern,
          receivedString: error.receivedString,
          location: error.location,
          resultId: error.resultId,
        },
      });
    }
    console.log(`✅ Migrated ${resultErrors.length} result errors`);

    // 6. Migrate Assumptions (depends on Issue and ResultError)
    console.log('🤔 Migrating Assumptions...');
    const assumptions = await dbAll('SELECT * FROM Assumption ORDER BY id');
    for (const assumption of assumptions) {
      await prisma.assumption.create({
        data: {
          id: assumption.id,
          createdAt: new Date(assumption.createdAt),
          updatedAt: new Date(assumption.updatedAt),
          isConfirmed: Boolean(assumption.isConfirmed),
          score: assumption.score,
          madeBy: assumption.madeBy,
          issueId: assumption.issueId,
          resultErrorId: assumption.resultErrorId,
        },
      });
    }
    console.log(`✅ Migrated ${assumptions.length} assumptions`);

    // Update sequences to match the max IDs
    console.log('🔄 Updating PostgreSQL sequences...');
    const maxIds = {
      execution: Math.max(...executions.map(e => e.id), 0),
      spec: Math.max(...specs.map(s => s.id), 0),
      result: Math.max(...results.map(r => r.id), 0),
      resultError: Math.max(...resultErrors.map(re => re.id), 0),
      assumption: Math.max(...assumptions.map(a => a.id), 0),
      issue: Math.max(...issues.map(i => i.id), 0),
    };

    await prisma.$executeRaw`SELECT setval('public."Execution_id_seq"', ${maxIds.execution}, true);`;
    await prisma.$executeRaw`SELECT setval('public."Spec_id_seq"', ${maxIds.spec}, true);`;
    await prisma.$executeRaw`SELECT setval('public."Result_id_seq"', ${maxIds.result}, true);`;
    await prisma.$executeRaw`SELECT setval('public."ResultError_id_seq"', ${maxIds.resultError}, true);`;
    await prisma.$executeRaw`SELECT setval('public."Assumption_id_seq"', ${maxIds.assumption}, true);`;
    await prisma.$executeRaw`SELECT setval('public."Issue_id_seq"', ${maxIds.issue}, true);`;
    
    console.log('✅ Updated all PostgreSQL sequences');

    console.log('🎉 Migration completed successfully!');
    console.log('\n📊 Migration Summary:');
    console.log(`   Issues: ${issues.length}`);
    console.log(`   Executions: ${executions.length}`);
    console.log(`   Specs: ${specs.length}`);
    console.log(`   Results: ${results.length}`);
    console.log(`   Result Errors: ${resultErrors.length}`);
    console.log(`   Assumptions: ${assumptions.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await dbClose();
    await prisma.$disconnect();
  }
}

// Run the migration
migrateSQLiteToPostgres()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
