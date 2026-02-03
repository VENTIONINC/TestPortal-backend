# Production migration plan (CLI)

## Preconditions

- Backup snapshot taken
- Correct DATABASE_URL for target DB

## 1) Check schema drift

Run: DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public" npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma

- No output: schema matches
- SQL output: schema drift exists

## 2) Baseline existing DB (one-time only)

If table \_prisma_migrations is missing or empty:

- For each folder in prisma/migrations (oldest → newest), run:
  DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public" npx prisma migrate resolve --applied <migration_folder>

## 3) Apply pending migrations

Run: DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public" npx prisma migrate deploy

## 4) Verify

Run: DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public" npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma

- Expect no output

## 5) Runtime auto-migrate

Container startup runs migrations via [start.sh](start.sh#L1-L7). Ensure DATABASE_URL is set.

## 6) Cleanup (optional)

If you exported DATABASE_URL in your shell, remove it after:
unset DATABASE_URL
