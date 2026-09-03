#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

import {
  createDatabase,
  dropDatabase,
  getBranchDatabaseConfig,
  repoRoot,
  terminateDatabaseConnections,
} from './db_utils.mjs';

function main() {
  const config = getBranchDatabaseConfig();

  terminateDatabaseConnections(config);
  dropDatabase(config);
  createDatabase(config);

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: config.branchDatabaseUrl,
    },
  });

  process.stdout.write(`Branch: ${config.branch}\n`);
  process.stdout.write(`Database: ${config.branchDbName}\n`);
  process.stdout.write('DATABASE_URL line:\n');
  process.stdout.write(`DATABASE_URL="${config.branchDatabaseUrl}"\n`);
}

main();
