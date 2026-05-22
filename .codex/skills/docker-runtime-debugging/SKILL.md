---
name: docker-runtime-debugging
description: Troubleshoot build, startup, Docker, environment, Prisma generation, database connectivity, logging, and production runtime issues for the test-portal backend.
---

# Docker Runtime Debugging

Use this skill for backend runtime, deployment, Docker, build, startup, environment, logging, MCP transport, or database connectivity problems.

## Common Commands

Run from the repository root unless diagnosing a deployed environment.

```bash
npm run build
npm run server
npm run dev
npm run db:generate
npm run migrate
npm run inspector
```

## Procedure

1. Start with the failing command, environment, and exact error.
2. Separate build-time failures from runtime failures.
3. Check required environment variables and secret wiring without printing secret values.
4. Confirm Prisma client generation and database connectivity before chasing application logic.
5. For MCP issues, verify whether REST endpoints still work and whether the MCP transport/session layer is the failing boundary.
6. Prefer targeted diagnostics over broad command sweeps.

## Output

- State the most likely failure point and how it was confirmed.
- Give the next diagnostic or fix in concrete command/file terms.
- Keep environment problems separate from application-code problems.
- Include exact failing commands and relevant error lines.
