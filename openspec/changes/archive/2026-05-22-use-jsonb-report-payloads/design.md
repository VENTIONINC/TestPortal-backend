## Context

The backend currently persists structured report data in text columns:

- `Spec.tags` stores a stringified array.
- `Spec.annotations` stores a stringified array when present.
- `ResultError.callLog` stores a stringified array.
- `ResultError.callStack` stores a stringified array.

Services then parse these values back into arrays for API responses, analysis export, result review, and AI analysis. This makes the database representation drift away from the domain model and forces every consumer to remember which fields are secretly JSON.

The client currently consumes `spec.key`, `spec.file`, `spec.title`, and `spec.tags` in the results UI. It does not consume `spec.annotations`, and the generated `useGetApiV2SpecsBySpecIdQuery` hook is not used in the client.

## Goals / Non-Goals

**Goals:**

- Store structured report payloads as Prisma `Json` fields backed by PostgreSQL JSONB.
- Preserve supported client-facing response shapes, especially `spec.tags` as an array.
- Keep `Spec.annotations` internally persisted as an array payload, defaulting to `[]`, but remove it from the documented public OpenAPI contract.
- Replace string-based tag matching with semantic JSON array membership.
- Make malformed legacy JSON behavior explicit during migration.
- Keep frequently queried scalar fields, such as result status, spec file, spec title, execution environment, and analysis fields, as normal columns.

**Non-Goals:**

- No versioned REST API migration.
- No frontend changes are required by this storage update.
- No new report upload format is introduced.
- No JSONB indexing strategy beyond what is needed for current query behavior.
- No public exposure of future `rawPayload`, `metadata`, or `rawError` fields unless a later client use case requires it.

## Decisions

### Use Prisma `Json` for report payload arrays

Convert `Spec.tags`, `Spec.annotations`, `ResultError.callLog`, and `ResultError.callStack` to Prisma `Json` fields. PostgreSQL maps Prisma `Json` to JSONB for this datasource, giving the backend native storage for arrays and objects.

Alternative considered: keep text columns and centralize parse/stringify helpers. That would reduce repeated code, but it would preserve the core mismatch and keep tag filtering tied to serialized text.

### Preserve supported API response shapes with mapper functions

Add explicit normalization at service boundaries instead of relying on raw Prisma records as API responses. The normalized API/domain shape should expose:

- `spec.tags` as `string[]`
- `resultError.callLog` as `string[]`
- `resultError.callStack` as `string[]`

`spec.annotations` can continue to exist internally and may still appear in raw service records during migration, but it is not part of the supported public OpenAPI contract.

Alternative considered: remove `annotations` from runtime responses immediately. That is cleaner, but continuing to tolerate the field avoids unnecessary compatibility risk while OpenAPI stops promising it.

### Treat annotations as an internal array payload

Persist `Spec.annotations` as JSONB array data with a default empty array. Even though the client does not use it, preserving report annotations keeps the backend faithful to uploaded reports and leaves room for later internal analysis.

Alternative considered: drop the database column. That would simplify the schema, but it would discard source report metadata with little upside.

### Use exact JSON array membership for tag filtering

Replace string `contains` filtering on serialized tags with a JSON-aware filter that matches array elements exactly. This removes accidental substring matches such as matching `smoke` inside `smoke-test`.

Alternative considered: emulate substring behavior after loading results. That preserves old quirks, but it is less efficient and keeps surprising semantics.

### Handle malformed legacy values during migration

The migration/backfill should parse valid JSON strings and use safe fallbacks for malformed or incompatible values:

- malformed `Spec.tags` -> `[]`
- malformed `Spec.annotations` -> `[]`
- malformed `ResultError.callLog` -> `[]`
- malformed `ResultError.callStack` -> `[]`

The migration should document this fallback because malformed values cannot be reliably reconstructed as structured arrays.

## Risks / Trade-offs

- Tag filtering changes from substring matching to exact array membership -> Document this as an intentional behavior correction and cover it with tests.
- OpenAPI currently under-documents the actual `/api/v2/results` payload -> Update schemas carefully so supported nested fields match what the client uses without over-promising internal fields.
- JSON values are typed broadly in Prisma -> Add local type guards/normalizers to keep service outputs typed and predictable.
- Migration rollback from JSONB to text can stringify JSON values, but malformed original strings may not be recoverable -> Document fallback behavior in the migration.

## Migration Plan

1. Add a Prisma migration that converts existing text columns to JSONB using safe parsing/fallback logic.
2. Update Prisma schema fields to `Json`, using array defaults where Prisma/PostgreSQL support them cleanly.
3. Regenerate Prisma types.
4. Update write paths to pass arrays/objects directly.
5. Update read paths and API mappers to normalize JSON values to the public contract.
6. Update OpenAPI to remove `annotations` from supported spec response documentation and accurately document supported nested result fields.
7. Add tests for upload, result response shape, spec response shape, tag filtering, analysis export, and malformed legacy backfill behavior.
