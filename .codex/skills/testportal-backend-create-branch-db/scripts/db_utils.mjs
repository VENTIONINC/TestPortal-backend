import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const POSTGRES_IDENTIFIER_MAX = 63;

export const repoRoot = process.cwd();

const envPath = path.join(repoRoot, '.env');
const envExamplePath = path.join(repoRoot, '.env.example');

export function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...options,
  }).trim();
}

function readDatabaseUrl(filePath) {
  const envContents = fs.readFileSync(filePath, 'utf8');
  const match = envContents.match(/^DATABASE_URL="?([^"\n]+)"?$/m);

  if (!match) {
    throw new Error(`DATABASE_URL not found in ${filePath}`);
  }

  return match[1];
}

function slugifyBranch(branch) {
  return branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function getBaseDatabaseUrl() {
  if (fs.existsSync(envExamplePath)) {
    return readDatabaseUrl(envExamplePath);
  }

  return readDatabaseUrl(envPath);
}

export function getBranchDatabaseConfig() {
  const branch = run('git', ['branch', '--show-current']);
  if (!branch) {
    throw new Error('Could not determine the current git branch.');
  }

  const baseDatabaseUrl = getBaseDatabaseUrl();
  const parsedUrl = new URL(baseDatabaseUrl);
  const baseDbName = parsedUrl.pathname.replace(/^\//, '');
  const branchSlug = slugifyBranch(branch);

  if (!branchSlug) {
    throw new Error(`Could not derive a database name from branch "${branch}".`);
  }

  const rawBranchDbName = `${baseDbName}_${branchSlug}`;
  const branchDbName = rawBranchDbName.slice(0, POSTGRES_IDENTIFIER_MAX);

  if (branchDbName === baseDbName) {
    throw new Error(`Refusing to reuse base database "${baseDbName}".`);
  }

  parsedUrl.pathname = `/${branchDbName}`;

  return {
    branch,
    branchDbName,
    branchDatabaseUrl: parsedUrl.toString(),
    postgresContainer: process.env.POSTGRES_CONTAINER || 'test-portal-postgres',
    postgresUser: process.env.POSTGRES_USER || parsedUrl.username || 'postgres',
    adminDatabase: process.env.POSTGRES_ADMIN_DB || 'postgres',
  };
}

export function terminateDatabaseConnections(config) {
  run('docker', [
    'exec',
    config.postgresContainer,
    'psql',
    '-U',
    config.postgresUser,
    '-d',
    config.adminDatabase,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${config.branchDbName}' AND pid <> pg_backend_pid();`,
  ]);
}

export function dropDatabase(config) {
  run('docker', [
    'exec',
    config.postgresContainer,
    'psql',
    '-U',
    config.postgresUser,
    '-d',
    config.adminDatabase,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `DROP DATABASE IF EXISTS ${quoteIdentifier(config.branchDbName)};`,
  ]);
}

export function createDatabase(config) {
  run('docker', [
    'exec',
    config.postgresContainer,
    'psql',
    '-U',
    config.postgresUser,
    '-d',
    config.adminDatabase,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `CREATE DATABASE ${quoteIdentifier(config.branchDbName)};`,
  ]);
}
