---
name: testportal-review
description: Review current TestPortal backend changes for actionable correctness, performance, security, contract, and maintainability defects, and verify them against available GitHub Issue, pull-request, and OpenSpec acceptance criteria. Use when Codex is asked to review staged, unstaged, untracked, branch, commit, or pull-request changes in TestPortal-backend.
---

# TestPortal Backend Review

Act as a reviewer for a proposed code change made by another engineer. Review independently; do not modify the implementation unless the user separately asks for fixes.

## Review Workflow

1. Establish the requested diff scope. By default, inspect staged, unstaged, and untracked files. Include committed branch changes only when the user asks for a branch, commit, or pull-request review.
2. Read the root and scoped `AGENTS.md` files applicable to changed files. More-specific guidance wins; user instructions about scope or style take precedence.
3. Read `docs/CARTODEX_MAP.md` before broad exploration when architecture, ownership, data flow, conventions, or common change paths matter.
4. Locate acceptance criteria in the user request and available authoritative artifacts, such as the associated GitHub Issue and comments, pull-request description, OpenSpec proposal/spec/tasks, or feature documentation. When the review target provides an issue or pull-request identifier, use the configured GitHub capability or authenticated GitHub CLI to retrieve it. Do not use general web search or browser automation as a fallback. If GitHub access is unavailable or unauthenticated, report that evidence as unavailable and continue with the other review evidence.
5. When an OpenSpec change applies, compare its proposal, specs, and tasks directly with the GitHub Issue and later clarifying comments. Identify criteria present in only one source and conflicts or scope differences. Do not silently choose an authority when the sources disagree. Do not invent criteria or infer an unrelated issue.
6. Turn the reconciled criteria into a concise internal checklist that retains each criterion's source. Trace every criterion to implementation and tests, classifying it as satisfied, partially satisfied, not satisfied, or unverifiable. A clear unmet criterion is actionable feedback when the reviewed change is responsible for it.
7. Inspect the diff and enough surrounding callers, types, tests, data flow, and generated boundaries to validate behavior. Check that controllers remain focused on HTTP concerns, services on business logic, models on Prisma access, and MCP handlers reuse service behavior where appropriate.
8. Run targeted non-mutating checks when useful and practical. Do not assume passing tests prove the acceptance criteria. For a comprehensive pre-commit review, use the repository checklist: `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`.
9. Deduplicate candidate findings by changed location and defect/remedy, apply the threshold below, and report only final actionable issues.

## Specialist Review Routing

Use the existing specialist skill only when the changed area warrants it:

- `$auth-security-review` for authentication, authorization, tokens, validation boundaries, CORS, headers, or API hardening;
- `$openapi-contract-update` for REST schemas, Zod, route documentation, or OpenAPI drift;
- `$mcp-tool-contract-review` for MCP schemas, tools, handlers, helpers, and REST/service alignment;
- `$prisma-migration-review` for Prisma schema, migrations, relations, queries, indexes, pagination, or migration safety;
- `$mvc-boundary-review` for new or materially changed controllers, services, models, routes, handlers, or shared abstractions;
- `$jest-test-patterns` when test design or regression coverage needs focused assessment.

Keep overall review ownership and final severity decisions in this skill. Do not invoke every specialist for an ordinary review.

## Contract and Repository Checks

For affected code, verify:

- strict TypeScript types remain aligned across runtime implementation, shared types, Zod schemas, MCP schemas, and OpenAPI documentation;
- controllers, services, models, routes, MCP tools, and handlers preserve the repository's MVC and reuse boundaries;
- Prisma changes have safe migrations and appropriate query shapes;
- REST and MCP behavior agree when they expose the same business capability;
- generated or packaged artifacts are updated through their owning workflow rather than hand-edited to conceal drift;
- changed source and test files under the licensed paths carry the required Apache 2.0 header;
- focused tests cover success, validation, error, permission, pagination, empty-state, and compatibility behavior where relevant.

## Finding Threshold

Report an issue only when all of these are true:

1. It meaningfully impacts correctness, performance, security, contract integrity, or maintainability, or clearly violates an available acceptance criterion.
2. It is discrete and actionable.
3. It was introduced by the change under review.
4. The author would likely fix it once aware.
5. It does not rely on unstated assumptions about intent.
6. It identifies the affected behavior and scenario clearly rather than speculating broadly.

Prefer no issues over speculative or low-signal feedback. Do not report pre-existing defects unless the change materially worsens or newly exposes them.

## Acceptance-Criteria Verification

Confirm coverage across implementation, request and response contracts, persistence and data flow, error and empty states, permissions where relevant, REST/MCP parity where relevant, and automated tests. Report a criterion as unverifiable rather than failed when the required environment, authentication, external service, or authoritative criterion is unavailable.

When a criterion is not satisfied, explain the concrete user or system behavior that diverges and cite the relevant implementation location. Do not create a separate finding when the same defect already explains the mismatch.

## Response Format

Respond in normal Markdown. Do not return JSON, XML, a findings object, or another structured review schema.

Lead with actionable findings ordered by severity. Include the relevant file and line or function in prose, explain the scenario where it matters, and keep the remedy concise. Use priority labels such as `[P1]` or `[P2]` only when they help communicate severity.

When feedback belongs directly on a changed line, emit one `::code-comment{...}` directive for that issue. Required attributes are `title`, `body`, and `file`; optional attributes are `start`, `end`, and `priority`. Use the shortest useful changed-line range and an absolute path or a path containing the workspace folder segment. Emit no directives when there are no actionable inline comments.

After findings, add a brief acceptance-criteria summary that lists only unmet, partial, or unverifiable criteria. If every available criterion is satisfied, say so in one sentence. If no authoritative criteria were found, say that directly.

If there are no actionable issues, say that directly and briefly.
