---
name: create-branch-db
description: Create or drop a PostgreSQL database dedicated to the current git branch. Use when working in this repository and you need a clean branch-specific database for implementation, testing, or verification, or when you need to remove that isolated branch database without touching the shared development database.
---

Create or remove a branch-specific database and keep it isolated from the shared dev database.

## Workflow

1. Confirm the current branch with `git branch --show-current`.
2. Choose the operation:
   - Create fresh DB: `node .codex/skills/create-branch-db/scripts/create_branch_db.mjs`
   - Drop branch DB: `node .codex/skills/create-branch-db/scripts/drop_branch_db.mjs`
3. Let the script derive a branch database name from the current branch.
4. For create, recreate that database and apply `prisma migrate deploy`.
5. For create, return the printed `DATABASE_URL` and tell the user to update `.env` with that value.
6. For drop, report the dropped database name.

## Guardrails

- Run this skill only from this repository root.
- Keep the database separate from the base database named in `.env`.
- If the computed branch database name matches the base database name, stop and fix the naming logic instead of continuing.
- If Docker or Prisma access is blocked by the sandbox, request escalation and rerun the command.
- Do not edit `.env` automatically unless the user explicitly asks for that change.

## Output

Report:

- The database name
- Whether create or drop succeeded
- For create, the exact `DATABASE_URL="..."` line for `.env`
