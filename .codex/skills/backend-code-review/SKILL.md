---
name: backend-code-review
description: Review TestPortal backend implementation correctness, canonical conventions, and codebase design. Use for code quality, architecture, or pull-request implementation review.
---

# Backend Code Review

Review implementation correctness, backend conventions, and alignment with the codebase design.

Review is read-only unless the user also requests fixes. Do not rewrite requirements, update task
checkboxes, archive a change, or modify implementation to make the review pass. Validation commands
may produce normal local build/test artifacts; do not run migrations, live provider calls, or other
external mutations merely to collect review evidence without authorization for those actions.

## Establish the Review Scope

- Identify the requested change and diff/base revision. Distinguish changed code from pre-existing
  local work, inspect relevant callers and contracts, and tie findings to the reviewed change.
- Read `docs/engineering/backend-conventions.md`. Read `docs/CARTODEX_MAP.md` when
  architecture or ownership context is needed, then verify consequential claims in owning code.
- Use available task or design context to understand compatibility and intended use. Missing
  OpenSpec is not a blocker for this review. Mark conclusions that depend on unknown product intent
  as uncertain rather than inventing a requirement or accepting current code as its specification.

## Review Implementation Quality

Review changed code against the canonical backend conventions rather than copying their rules here.
Check correctness beyond the named scenarios: async races, null/optional values, runtime validation,
type assertions, error paths, query scope, transaction integrity, and compatibility with callers.
Assess ownership, dependencies, cohesion, reuse, and whether abstractions fit the existing design.
Separate concrete defects and required convention corrections from optional improvements; avoid
turning preferences or unrelated legacy cleanup into acceptance blockers.

Apply the following checks where relevant to the change. They are maintained here; no specialist
review skill needs to be loaded.

### Correctness and Design

- Trace changed entry points through adapters, services, and persistence, including affected callers.
  Check async ordering, races, retries, optional values, runtime parsing, and recoverable failures.
- Assess changed module boundaries against the conventions guide: transport concerns remain in
  adapters, business workflows in services, and persistence in models. Check dependencies, meaningful
  abstractions, and reuse of business behavior across REST and MCP.
- Verify model payloads preserve selected fields and relations, and types or assertions do not hide
  incompatible values. Separate concrete regressions from maintainability corrections.

### Security and Trust Boundaries

- Trace external input through validation and authorization to reads and writes. Verify project,
  tenant, and user scope and that access decisions precede sensitive operations.
- For token/session changes, check verification, issuer/audience where applicable, expiry,
  refresh/rotation, revocation, storage, and failure behavior.
- Check password and secret handling, CORS/security headers where changed, and accidental exposure
  in responses, logs, errors, or published schemas. Explain attack preconditions for security findings;
  distinguish demonstrated vulnerabilities from optional hardening.

### Persistence and Migrations

- Inspect affected Prisma definitions, migrations, and model/service queries together. Check existing
  data, nullable/default transitions, constraints, uniqueness, and rollout compatibility.
- Verify transaction boundaries and consistent transaction-client use, including partial failure.
  Check deterministic ordering and pagination, relation loading, selected payloads, and N+1 risks.
- Compare filters, joins, and ordering with indexes. Consider aggregation, JSON/report ingestion,
  unnecessary reads, and write costs. Explain index/migration tradeoffs; recommend measurement when
  a performance concern is plausible but unproven rather than presenting it as a confirmed defect.

### REST and MCP Contracts

- Compare runtime parsing, adapter inputs, service requirements, and responses with Zod schemas,
  OpenAPI registrations, and MCP schemas/descriptions for the changed surface.
- Check params, query/body fields, optionality, defaults, status codes, serialized responses, and
  documented authentication assumptions. Identify implementation/documentation drift.
- For MCP, verify tool registration and schema/handler agreement, stable typed outputs, and use of
  `src/mcp/helpers/mcpHelpers.ts` for responses and errors. Compare shared REST/MCP behavior without
  assuming their transport representations must be identical.
- Assess schema reuse and the existing OpenAPI module organization. Do not require documentation
  for deliberately internal behavior; report intentional omissions when relevant to the review.

### Regression Coverage

- Inspect nearby tests for changed behavior, realistic edge cases, and error paths. Assess observable
  outcomes and contract shapes rather than file placement or assertions that mirror implementation.
- Check mocks at stable boundaries: models/Prisma for services, services for controllers/routes, and
  services or helpers for MCP handlers. Identify where mocking conceals a cross-boundary defect that
  needs integration evidence.
- Use the centralized `__tests__/` structure and current Jest/TypeScript patterns when evaluating
  test changes. Report concrete coverage gaps and which behavior they leave unprotected.

Run focused checks that resolve real uncertainty. Apply the repository's required checks when
review scope requires them. Report commands actually run, outcomes, and validation not performed.
Do not infer a defect from unavailable validation or report unrun checks as passed.

## Review Result

Lead with an implementation verdict: **Pass**, **Issues found**, or **Unverified**. Limit a pass to
the reviewed scope and evidence; do not imply behavior or deployment acceptance. When concrete
issues and evidence gaps coexist, report issues found and list the remaining uncertainty.

Present actionable findings ordered by severity, with affected file/line, concrete impact,
supporting evidence, the applicable convention or invariant, and a practical correction.
Deduplicate findings across the checklists. Distinguish defects, required convention corrections, and optional
suggestions; prioritize by impact rather than by checklist. Do not block acceptance on unrelated
legacy cleanup or unsupported stylistic preferences.

Close with validation performed and material limitations. If there are no findings, state that
within the reviewed scope. An implementation pass does not establish requirements acceptance.

## Output Format

Use these sections in order for every code review. Replace placeholders with actual evidence and
choose one verdict. Scale detail to the change while keeping material uncertainty visible.

```markdown
**Code review: Pass / Issues found / Unverified**

One sentence explaining the verdict and its scope.

### Scope and basis

- Reviewed: change identifier and diff/base revision or local files reviewed.
- Basis: applicable backend conventions and relevant caller, contract, or design context.
- Coverage: relevant checklist areas examined; identify material exclusions.

### Findings

1. **[P1] Short finding title** — linked file and line.
   - Kind: Defect / Required convention correction.
   - Area: Correctness and design / Security / Persistence / Contracts / Regression coverage.
   - Evidence: concrete trigger, code path, or check result supporting the finding.
   - Impact: observable consequence or specific maintainability cost.
   - Basis: violated invariant, contract, or convention, with its source where applicable.
   - Correction: the smallest practical change addressing the issue.

### Validation and limitations

- Performed: exact commands and results, plus relevant code inspection or manual checks.
- Unverified: unresolved claims, unavailable checks, and the evidence needed; use None when absent.
```

Use P0 for an immediate critical defect, P1 for a high-impact issue, P2 for a normal issue, and P3
for a low-impact issue. Order findings by impact and choose a single kind and area for each finding;
mention additional areas only when useful. Explain attack preconditions for security defects and
distinguish measured performance problems from hypotheses needing measurement.

Link verified file locations, keep line ranges tight, and deduplicate issues spanning several
checklists. A required convention correction must cite an applicable rule and stay within the change
scope. Do not present personal preferences, unrelated legacy cleanup, or unavailable validation as
demonstrated defects.

When there are no actionable findings, replace the numbered list with
"No implementation issues found within the reviewed scope." This can accompany an Unverified
verdict; missing evidence must remain in the limitations. A Pass verdict requires sufficient evidence
for the reviewed implementation scope. When issues and evidence gaps coexist, use Issues found and
retain the gaps explicitly.

Include an **Optional suggestions** section between findings and validation only when useful or
requested. Keep suggestions separate from defects and required corrections; they do not determine
the verdict. Report behavior acceptance separately only when requested, not as part of this verdict.
