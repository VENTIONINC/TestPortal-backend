## 1. Schema And Migration

- [x] 1.1 Update `prisma/schema.prisma` so `Spec.tags`, `Spec.annotations`, `ResultError.callLog`, and `ResultError.callStack` use Prisma `Json` fields.
- [x] 1.2 Add optional future JSON fields only if needed by the implementation scope, keeping `Result.rawPayload`, `Result.metadata`, and `ResultError.rawError` out of public APIs unless explicitly used.
- [x] 1.3 Create a Prisma migration that converts existing text values to JSONB values.
- [x] 1.4 Document migration fallback behavior for malformed legacy JSON strings.
- [x] 1.5 Regenerate Prisma client types.

## 2. Domain Normalization

- [x] 2.1 Add typed helpers or mappers that normalize Prisma JSON values into `string[]` arrays for tags, call logs, and call stacks.
- [x] 2.2 Update shared TypeScript interfaces in `src/types` to reflect JSON-backed structured payloads without using `any`.
- [x] 2.3 Ensure malformed or unexpected runtime JSON values normalize to safe empty arrays at service boundaries.

## 3. Write Paths

- [x] 3.1 Update report ingestion in `src/services/jsonReportService.ts` to write tags, annotations, call logs, and call stacks as structured values without `JSON.stringify`.
- [x] 3.2 Preserve uploaded annotations internally as an array, defaulting to `[]` when absent.
- [x] 3.3 Verify CTRF and raw Playwright report transformations continue to feed compatible structured values.

## 4. Read Paths And Workflows

- [x] 4.1 Update `/api/v2/results` read logic to return supported nested fields with array-shaped tags, call logs, and call stacks.
- [x] 4.2 Update `getResultById` and result error lookup paths to apply the same normalization where responses expose structured payloads.
- [x] 4.3 Update `specService.getSpecById` to return supported spec fields without relying on string parsing.
- [x] 4.4 Update automatic error review and similarity logic to consume JSON arrays directly.
- [x] 4.5 Update AI analysis and analysis export paths so call stacks and tags remain compatible.

## 5. Filtering And API Contract

- [x] 5.1 Replace serialized text tag filtering with exact JSON array membership filtering.
- [x] 5.2 Update OpenAPI schemas to stop documenting `Spec.annotations` as a public spec response field.
- [x] 5.3 Update OpenAPI result schemas to document supported nested `spec`, `execution`, and `errors` response fields that the client consumes.
- [x] 5.4 Keep future raw JSON payload fields undocumented and unexposed unless a separate client requirement appears.

## 6. Tests And Verification

- [x] 6.1 Add or update report upload tests proving structured JSON fields are persisted and returned as arrays.
- [x] 6.2 Add result response tests for array-shaped `spec.tags`, `error.callLog`, and `error.callStack`.
- [x] 6.3 Add tag filtering tests for exact element matching and non-matching substrings.
- [x] 6.4 Add analysis export and error review tests for JSON-backed payloads.
- [x] 6.5 Add migration/backfill coverage or documented SQL verification for valid and malformed legacy values.
- [x] 6.6 Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`.
