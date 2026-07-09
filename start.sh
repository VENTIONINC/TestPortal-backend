#!/bin/sh
set -e

echo "Ensuring database exists..."
node --input-type=module <<'NODE'
import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const targetUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(targetUrl.pathname.replace(/^\/+/, ""));

if (!databaseName) {
  console.error("DATABASE_URL must include a database name.");
  process.exit(1);
}

const adminUrl = new URL(databaseUrl);
adminUrl.pathname = "/postgres";

const quoteIdentifier = (value) => `"${value.replace(/"/g, "\"\"")}"`;

let client;

for (;;) {
  try {
    client = new Client({ connectionString: adminUrl.toString() });
    await client.connect();
    break;
  } catch (error) {
    console.log("Waiting for PostgreSQL server...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

try {
  const existsResult = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [databaseName],
  );

  if (existsResult.rowCount === 0) {
    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    console.log(`Created database ${databaseName}.`);
  } else {
    console.log(`Database ${databaseName} already exists.`);
  }
} finally {
  await client.end();
}
NODE

echo "Waiting for database..."
until npx prisma db execute --stdin --schema prisma/schema.prisma <<'SQL'
SELECT 1;
SQL
do
	sleep 2
done

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding persisted skill packages..."
node dist/prisma/seed/index.js

if [ "$AUTH_PROVIDER" = "local" ] || [ -n "$ADMIN" ] || [ -n "$ADMIN_EMAIL" ] || [ -n "$ADMIN_PASSWORD" ]; then
	echo "Bootstrapping admin user..."
	node dist/scripts/bootstrap-admin.js
else
	echo "Skipping admin bootstrap. Set ADMIN and ADMIN_PASSWORD to seed an admin user."
fi

echo "Starting the application..."
exec node dist/index.js
