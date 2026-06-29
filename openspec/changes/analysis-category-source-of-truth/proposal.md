## Why

Issue categorization currently has two competing sources: `Issue.category` and result-level analysis fields. This creates ambiguous reporting, loses issue category context when an issue is deleted, and lets issue categories drift from the analyzed results they are meant to summarize.

## What Changes

- **BREAKING** Remove persisted issue categories from the issue data model and issue create/update/read contracts.
- Make result analysis the single categorization source of truth:
  - AI-provided category remains stored as `Result.analysisCategory`.
  - User-provided category corrections remain stored as `Result.analysisFeedbackCategory` with reviewer metadata.
  - Effective result category is derived as `analysisFeedbackCategory ?? analysisCategory`.
- Add derived issue category summaries for issue responses that need category display.
- Represent mixed issue categories explicitly when linked results do not all share the same effective category.
- Update issue statistics and result statistics so issue category display is computed from linked results rather than read from `Issue.category`.
- Update REST, MCP, OpenAPI, TypeScript types, Prisma schema, migrations, and tests to align with the single-source categorization model.

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
- Types under `src/types` that currently require or expose issue category.
- Jest coverage for issue creation, update, filtering, statistics, and result statistics.
