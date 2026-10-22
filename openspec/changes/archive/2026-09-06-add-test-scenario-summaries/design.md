## Context

Test Scenarios currently persist a required title, raw `contentMd`, creator ID, and project ownership. REST list requests use the full-row query and expose `contentMd`, while MCP list requests use a separate compact projection. Neither path exposes descriptive `details` or a populated creator summary. The change spans Prisma, validation, MVC layers, REST, MCP, OpenAPI, and generated-client compatibility.

The existing creator relation is required and protected by an `ON DELETE RESTRICT` foreign key. User deletion and orphaned creator recovery are therefore separate lifecycle concerns rather than list-response behavior for this change.

## Goals / Non-Goals

**Goals:**

- Persist optional normalized plain-text `details` metadata without changing raw Markdown semantics.
- Use one project-scoped summary query and service path for REST and MCP lists.
- Return safe creator data containing only `id`, `name`, and `email` while retaining `createdById`.
- Guarantee that list queries neither select nor return `contentMd`.
- Keep pagination, deterministic ordering, project isolation, and full-detail behavior stable.
- Publish accurate runtime, MCP, and OpenAPI contracts for the new shapes.

**Non-Goals:**

- Handling user deletion, orphaned Test Scenario creators, or changing the creator foreign key.
- Rendering, deriving, or truncating Markdown into `details`.
- Interpreting or sanitizing `details` as Markdown or HTML.
- Search, filtering, revision history, or creator reassignment.
- Regenerating or changing dependent client repositories in this backend change.

## Decisions

### Store details as a nullable text column

Add `details String? @db.Text` to `TestScenario` through a migration that adds a nullable column without a backfill. Existing records therefore read as `details: null`, avoiding a fabricated summary and allowing a safe additive database deployment.

Alternative considered: derive a preview from `contentMd`. This would couple list behavior to Markdown parsing/truncation, prevent author-controlled summaries, and still risk loading the full body.

### Normalize non-null details at the service boundary

Creation accepts omitted `details` or a string containing at least one non-whitespace character. Partial updates accept a non-blank string, `null`, or omission. Non-null values are trimmed before persistence; `null` clears the field; omission preserves it. A details-only update is valid, and unsupported/read-only fields remain rejected.

The service repeats the invariant so REST and MCP callers receive equivalent behavior even if validation is bypassed internally. `details` remains ordinary text; output consumers are responsible for rendering it as text rather than executable markup.

Alternative considered: preserve details byte-for-byte like `contentMd`. Details is summary metadata rather than authored source, so trimming gives the non-blank contract predictable semantics without changing the explicit exact-preservation guarantee for Markdown.

### Use one summary projection for REST and MCP

Replace the separate full REST list and compact MCP list paths with one model selection and one service method. The Prisma selection contains only:

- `id`
- `projectId`
- `createdById`
- `title`
- `details`
- `createdAt`
- `updatedAt`
- `createdBy: { id, name, email }`

The selection itself is the performance and data-exposure boundary: `contentMd` is not fetched and is not removed after retrieval. Both REST and MCP handlers delegate to the same service path and preserve the existing count query, page/limit rules, project predicate, and `createdAt DESC, id DESC` ordering.

Alternative considered: keep two service methods or strip `contentMd` in the controller. Both approaches permit contract drift and the latter still transfers every Markdown body from PostgreSQL.

### Keep creator attribution required in this contract

Each summary exposes both the existing `createdById` and a required `createdBy` object with exactly `id`, `name`, and `email`. The model query selects only those user fields rather than loading a complete User record or reusing a serializer that first receives sensitive columns. Tests assert `createdBy.id === createdById` and the absence of password, token, role, status, and integration fields.

The current required relation and restrictive foreign key make an unresolved creator invalid database state. Changing deletion semantics or defining a nullable/tombstone creator is deferred to a separate issue.

Alternative considered: include the existing Issue user summary with `createdAt`. The catalog needs only identity and display/contact fields, so the narrower projection avoids an unnecessary field.

### Preserve complete scenario responses

Create, REST detail, REST update, MCP detail, and MCP update continue returning the complete scenario record with exact `contentMd`; they additionally return nullable `details`. Updating only `details` must not alter `contentMd`, title, creator, project, creation time, or evidence links.

`createdBy` is added to list summaries only. Full scenario responses continue identifying the creator through `createdById`, avoiding an unrelated expansion of every response shape.

### Represent the breaking list contract explicitly

OpenAPI defines a dedicated `TestScenarioSummary` and makes `TestScenarioListResponse.scenarios` reference it. The full `TestScenario` schema gains nullable `details`, and create/update schemas describe the new inputs, including explicit clearing. MCP input schemas and help text expose equivalent update semantics.

Dependent clients must regenerate from the final OpenAPI document. Consumers that need Markdown must call the detail endpoint rather than relying on list items.

## Risks / Trade-offs

- [Breaking REST response for clients that read `contentMd` from lists] → Mark the change as breaking, regenerate dependent clients, and require detail reads for Markdown.
- [Runtime and OpenAPI update validation diverge] → Cover omitted, string, `null`, details-only, blank, and unknown-field cases in both schema and generated-contract tests.
- [Sensitive User fields leak through relation loading] → Use an explicit nested Prisma `select` and assert the exact creator keys in model, service, route, MCP, and OpenAPI tests.
- [REST and MCP summaries drift again] → Expose a single summary type, model projection, and service method shared by both transports.
- [Text is rendered as markup by a consumer] → Document `details` as plain text and keep Markdown/HTML interpretation out of the backend contract.
- [Rollback after clients depend on the new schema] → Treat code/OpenAPI rollback as coordinated; the nullable database column may safely remain during rollback.

## Migration Plan

1. Add and apply the nullable `details` column migration; existing rows require no backfill.
2. Deploy backend code that reads/writes `details` and serves the shared summary contract.
3. Publish the final OpenAPI document and regenerate dependent clients.
4. Update list consumers to use `details` and `createdBy`, and to request detail when Markdown is needed.

Database rollback may leave the unused nullable column in place. Dropping it is optional and must occur only after confirming no deployed backend writes it.

## Open Questions

None. Creator projection, details normalization, and creator-deletion scope are settled for this change.
