#!/bin/sh
set -e

echo "Waiting for database..."
until npx prisma db execute --stdin --schema prisma/schema.prisma <<'SQL'
SELECT 1;
SQL
do
	sleep 2
done

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting the application..."
exec node dist/index.js
