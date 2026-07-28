## Why

Issue categorization currently has two competing sources: `Issue.category` and result-level analysis fields. This creates ambiguous reporting, loses issue category context when an issue is deleted, and lets issue categories drift from the analyzed results they are meant to summarize.

## What Changes

- **BREAKING** Remove persisted issue categories from the issue data model and issue create/update/read contracts.
- Make result analysis the single categorization source of truth:
  - AI-provided category remains stored as `Result.analysisCategory`.
  - User-provided category corrections remain stored as `Result.analysisFeedbackCategory` with reviewer metadata.
  - Effective result category is derived as `analysisFeedbackCategory ?? analysisCategory`.
- Normalize effective categories through one shared helper, including compatibility for the legacy `environment` spelling of `infra`.
- Add derived issue category summaries for issue responses that need category display.
- Represent mixed issue categories explicitly when linked results do not all share the same effective category.
- Count each distinct linked result once when deriving an issue category summary, even when multiple errors or assumptions connect that result to the same issue.
- Update issue statistics, result statistics, and dashboard category metrics to use effective result categories rather than `Issue.category` or unreviewed AI category alone.
- Remove issue category filtering without introducing a replacement derived filter in this release.
- Update REST, MCP, OpenAPI, TypeScript types, Prisma schema, migrations, and tests to align with the single-source categorization model.
- Update human-facing MCP/API documentation and Postman examples to describe the breaking contract migration.

## Capabilities

### New Capabilities
- `analysis-category-source-of-truth`: Result analysis and feedback provide the canonical failure category, while issue category display is derived from linked result categories.

### Modified Capabilities

## Impact

- Prisma `Issue` model, migrations, generated client usage, and seed/migration helpers.
- Issue REST endpoints and OpenAPI schemas for create, update, list, detail, and stats responses.
- MCP issue schemas, tools, handlers, and tool descriptions.
- Issue service/model filtering and serialization.
- Result statistics that currently expose `topIssues[].category`.
- Dashboard aggregation and refresh behavior after analysis feedback changes.
- Types under `src/types` that currently require or expose issue category.
- MCP documentation and Postman issue examples that still send, filter, or assert issue category.
- Jest coverage for issue creation, update, filtering, statistics, result statistics, and dashboard category metrics.
