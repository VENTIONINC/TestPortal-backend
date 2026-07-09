#!/usr/bin/env node

import {
  dropDatabase,
  getBranchDatabaseConfig,
  terminateDatabaseConnections,
} from './db_utils.mjs';

function main() {
  const config = getBranchDatabaseConfig();

  terminateDatabaseConnections(config);
  dropDatabase(config);

  process.stdout.write(`Branch: ${config.branch}\n`);
  process.stdout.write(`Dropped database: ${config.branchDbName}\n`);
}

main();
