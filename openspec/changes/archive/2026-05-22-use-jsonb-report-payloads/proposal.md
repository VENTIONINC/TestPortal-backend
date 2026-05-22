## Why

Structured report payloads are currently stored as stringified JSON in text columns, which forces manual `JSON.stringify` on writes and `JSON.parse` on reads. Moving these values to JSONB-backed Prisma `Json` fields reduces parsing boilerplate, makes malformed legacy data handling explicit, and prepares the backend for future raw report, AI metadata, and provider-specific payloads.

## What Changes

- Store nested report and error payloads in JSONB-backed Prisma `Json` fields instead of stringified text.
- Backfill existing stringified values into JSON values with safe fallbacks for malformed legacy data.
- Remove manual serialization/deserialization from report ingest, result reads, spec reads, analysis export, and error similarity paths.
- Preserve the existing client-facing REST response shape for supported fields.
- Keep `Spec.annotations` as an internal persisted report payload, but stop documenting it as part of the public OpenAPI contract because the client does not consume it.
- Use semantic JSON filtering for tag queries instead of substring matching serialized JSON text.

## Capabilities

### New Capabilities
- `report-json-payload-storage`: Stores and serves structured report, spec, and result error payloads using JSONB while preserving the supported client API contract.

### Modified Capabilities
- None.

## Impact

- Prisma schema and generated client types for `Spec`, `ResultError`, and possibly `Result`.
- A new database migration to convert existing text columns to JSONB and document fallback behavior.
- Report ingestion in `src/services/jsonReportService.ts`.
- Result/spec read paths in `src/services/resultService.ts`, `src/services/specService.ts`, and related models.
- Result error review and AI analysis paths that currently parse `callLog` and `callStack`.
- OpenAPI schemas for specs/results to accurately represent supported public fields.
- Tests covering upload, result responses, tag filtering, analysis export, and malformed legacy migration behavior.
