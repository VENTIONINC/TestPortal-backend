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

if [ "$AUTH_PROVIDER" = "local" ] || [ -n "$ADMIN" ] || [ -n "$ADMIN_EMAIL" ] || [ -n "$ADMIN_PASSWORD" ]; then
	echo "Bootstrapping admin user..."
	node dist/scripts/bootstrap-admin.js
else
	echo "Skipping admin bootstrap. Set ADMIN and ADMIN_PASSWORD to seed an admin user."
fi

echo "Starting the application..."
exec node dist/index.js
