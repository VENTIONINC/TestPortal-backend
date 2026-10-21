## Context

TestPortal has two Playwright ingestion routes. Direct JSON upload normalizes native `stdout`/`stderr`, `error.snippet`, and optional producer-supplied enrichment before `jsonReportService` persists a `ResultError`. The CLI instead converts Playwright into `UnifiedReport`, then into CTRF; its current unified model drops logs and generated test cases, and its serializer keeps only the first error from the final attempt. The backend CTRF importer already accepts test-level `meta.logs`, `meta.sourceSnippet`, and `meta.generatedTestCase`, but that local `meta` convention is not the current CTRF extension mechanism.

The current normative CTRF working draft identifies itself as `specVersion: "0.0.0"`, requires `reportFormat`, `specVersion`, and `results`, provides standard test diagnostics and retry attempts, and permits custom fields only inside `extra`. The repositories currently neither emit these root fields nor validate output against a pinned schema. The database already supports multiple `ResultError` rows per `Result` and has nullable columns for all three diagnostic fields, so no persistence migration is needed.

## Goals / Non-Goals

**Goals:**

- Preserve Playwright diagnostic enrichment through CLI-generated CTRF and backend import.
- Make source interpretation extensible through registered mappers and a provider-independent normalized representation.
- Preserve attempts, ordered errors, and deterministic diagnostic-to-error association.
- Emit schema-conformant, namespaced CTRF extension data while accepting legacy TestPortal CTRF.
- Prove direct-import and CTRF-mediated semantic equivalence with shared fixtures and automated tests.

**Non-Goals:**

- Generate test cases when Playwright or another producer does not supply them.
- Add diagnostic extraction for every existing CLI provider in this change.
- Change the client modal or public result-error response contract.
- Remove legacy `meta` support immediately.
- Perform unrelated report-ingestion or CLI refactoring.

## Decisions

### Evolve the existing provider registry into the mapper boundary

`BaseProvider` already supplies registry-selected validation and conversion. Evolve that contract so providers produce an error-aware normalized report, and treat each provider as the source-specific mapper. `Converter`, file output, and webhook delivery continue to invoke one common CTRF serializer.

A separate Playwright-only mapper registry was rejected because it would duplicate the existing provider registry and make selection ownership ambiguous. Conditional enrichment inside `convertUnifiedToCTRF` was rejected because it couples a universal serializer to source formats.

### Normalize attempts and ordered errors explicitly

Replace the lossy error shape with a normalized structure in which each test contains attempts and each attempt contains ordered errors. Each normalized error may carry `{ rawLogs, sourceSnippet, generatedTestCase }`. Preserve standard message, stack, location, status, timing, and retry data alongside diagnostics.

Attempt-level Playwright diagnostics are associated with the primary error, defined as `result.error` when present and otherwise the first entry in `result.errors`. Remaining `result.errors` entries are retained without fabricated enrichment. If the same logical error appears in both fields, canonical extraction deduplicates it by stable source position plus message/stack identity. This rule must be shared by direct and CLI behavior and captured in fixtures.

Keeping enrichment only at test level was rejected because it cannot distinguish retries or multiple errors. Copying the same logs onto every error was rejected because it creates false error-specific associations and inflates storage.

### Use shared contract fixtures as the cross-repository source of truth

The backend and CLI are separate packages and currently have no shared runtime dependency. Define canonical Playwright extraction fixtures and expected normalized output in a small versioned fixture/contract package or a deliberately shared repository artifact consumed by both test suites. Extract pure normalization helpers within each deployable boundary only where unavoidable, and require both implementations to pass the same contract vectors.

Publishing a new runtime package immediately was considered, but it increases release coordination and can be deferred if shared contract tests prevent semantic drift. Copying untested logic between repositories was rejected.

### Target the pinned CTRF working-draft schema and use `extra`

Pin the supported CTRF schema artifact corresponding to `specVersion: "0.0.0"` for this change, emit `reportFormat: "CTRF"`, and validate representative CLI output against that exact schema in tests. Do not fetch a mutable remote schema during tests. Future schema upgrades require an explicit compatibility change.

Use the versioned `extra.testPortal.errors` object as the single authoritative storage location for TestPortal diagnostics. Do not duplicate `rawLogs` or `sourceSnippet` into `tests[]` (or retry-attempt standard fields). Store reconstruction data and per-error association under the nearest available `extra` object:

```json
{
  "extra": {
    "testPortal": {
      "version": 1,
      "errors": [
        {
          "index": 0,
          "rawLogs": ["browser started", "request failed"],
          "sourceSnippet": {
            "path": "checkout.spec.ts",
            "text": "...",
            "startLine": 10,
            "failingLine": 12
          },
          "generatedTestCase": "test('checkout', async () => {});"
        }
      ]
    }
  }
}
```

When retry-attempt `extra` is available, attempt-specific extensions live there. Standard `message`, `trace`, and location fields may remain on the test for generic CTRF consumers, but diagnostic enrichment is emitted only in the namespaced extension. A versioned namespace was chosen over bare keys to avoid collision and enable additive evolution.

Continuing to emit `meta` was rejected because current CTRF permits extensions only within `extra`. Custom top-level fields were rejected for the same reason.

### Parse extensions independently of the originating framework

Create a provider-neutral TestPortal CTRF-extension decoder that accepts `unknown`, checks the namespace version and bounds, and returns normalized errors/diagnostics. `ctrfService` consumes this output without checking `results.tool.name`. Existing legacy `meta` keys remain a lower-priority compatibility input.

Unknown keys are ignored. Malformed optional fields are discarded independently. Unsupported namespace versions are ignored with bounded structural logging that never includes diagnostic payload contents. Standard CTRF data still imports.

### Extend backend report ingestion to persist ordered errors

Evolve the internal `TestResult` contract from one optional `error` to ordered `errors`, while accepting the singular field during migration. Batch persistence creates one `ResultError` per normalized error with a stable association to the created `Result`. Direct Playwright and CTRF transformations both feed this same internal form.

Creating synthetic backend `Result` records per error was rejected because errors already have the correct one-to-many relation to a result. A database migration was rejected because the existing schema supports the required cardinality.

### Keep rollout additive

The backend reads both conformant `extra.testPortal` and legacy `meta`, with `extra.testPortal` taking precedence when both are present. The CLI begins emitting only the new conformant representation. Optional fields remain optional, and upload endpoints do not change.

## Risks / Trade-offs

- [CTRF is still pre-1.0 and its schema may change] → Vendor or dependency-pin the exact validated schema and treat upgrades as explicit migrations.
- [Existing consumers may rely on the repository's legacy CTRF shape] → Add required modern root fields additively, preserve currently consumed result fields, and cover webhook/output compatibility.
- [Direct and CLI extraction can drift across repositories] → Run identical versioned contract fixtures in both suites and document the canonical precedence and association rules.
- [Multiple-error persistence changes analysis inputs] → Preserve source order, retain singular-error compatibility, and add regression coverage for analysis and result retrieval.
- [Logs and source text may be large or sensitive] → Reuse current byte limits, sanitize snippets, avoid payload logging, and discard malformed fields independently.
- [Retry representation may expose existing summary differences] → Separate diagnostic equivalence assertions from unrelated aggregate semantics, then add focused retry/status regression tests.

## Migration Plan

1. Add contract fixtures and failing tests in both repositories for canonical Playwright normalization, multiple errors, missing fields, invalid fields, and legacy CTRF.
2. Update backend internal result/error normalization and persistence to support ordered errors while retaining singular `error` input.
3. Add the provider-neutral namespaced extension decoder and legacy `meta` fallback to the backend; align TypeScript, OpenAPI, and MCP CTRF contracts.
4. Evolve CLI normalized types and the Playwright provider, then update the common serializer to emit pinned-schema CTRF and versioned `extra.testPortal` data.
5. Validate CLI output against the pinned schema and run direct-versus-round-trip equivalence coverage.
6. Release and deploy the additive backend reader before releasing the new CLI producer.

Rollback the CLI producer to the previous version while leaving the additive backend reader deployed. If backend rollback is necessary, newly generated CTRF remains standard-consumable, but older backend versions will ignore its `extra` diagnostics rather than fail standard-field import.

## Open Questions

- Should the shared extraction contract be published as a reusable package immediately, or should the first iteration use shared versioned fixtures while retaining small boundary-local adapters? The implementation should prefer a package only if repository release tooling already supports coordinated versioning without materially expanding scope.
- How long should legacy `meta` reads remain supported? This change keeps them indefinitely unless a later deprecation proposal defines usage telemetry and a removal window.
