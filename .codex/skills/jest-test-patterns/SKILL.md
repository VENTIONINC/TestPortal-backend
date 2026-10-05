---
name: jest-test-patterns
description: Add, improve, or review Jest tests for the test-portal backend. Use for controller, service, model, route, MCP handler, and regression coverage work.
---

# Jest Test Patterns

Use this skill when writing or reviewing tests in this backend.

## Project Context

- Tests live under the centralized `__tests__/` tree.
- The project uses Jest with TypeScript.
- Existing tests define the preferred mocking and Arrange-Act-Assert style.
- MVC and MCP layers often need different mocking approaches.
- Path aliases from `tsconfig.json` should be preserved.

## Procedure

1. Find nearby tests for the same layer or feature before adding new patterns.
2. Put tests in the matching `__tests__/` location.
3. Cover behavior, edge cases, and error paths that the implementation could realistically regress.
4. Mock at stable boundaries: Prisma/model for services, services for controllers/routes, helpers or services for MCP handlers.
5. Keep assertions focused on observable behavior and contract shape.
6. Run the narrowest useful Jest command first, then broader checks when risk warrants it.

## Output

- Point to exact test files added or updated.
- Mention the behavior protected by each test group.
- Call out coverage gaps if full coverage is not practical.
- Report the exact Jest command run and whether it passed.
