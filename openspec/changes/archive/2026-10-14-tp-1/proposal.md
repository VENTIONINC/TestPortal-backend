# Proposal

## Why

TP-1 needs a reproducible, opt-in Jev classification experiment using the existing stored-result datasets. This provides category accuracy, latency, and usage evidence without changing production analysis or implying that category-only predictions satisfy the full analysis contract.

## What Changes

- Add a TypeSafe/Jev category evaluation runner and dedicated smoke/regression suites, adapting the evaluation-only implementation in [PR #113](https://github.com/VENTIONINC/TestPortal-backend/pull/113).
- Expose the suites through the separate `stored-results-analysis-typesafe` Jest project and `TYPESAFE_API_KEY`; ordinary tests and the existing stored-results-analysis project must not invoke Jev. Missing or blank credentials must cause the live suites to skip before dataset reads or provider calls; direct runner use must reject missing credentials.
- Reuse the existing smoke/regression datasets and add the shared evaluation-report helper missing from this branch. Save timestamped and latest reports with model, category accuracy, duration, request count, token usage, per-case predictions, raw provider confidence, and category probabilities. Ignore generated reports in Git.
- Document setup, commands, report interpretation, and category-only limitations; add isolated runner and reporting tests.
- Preserve production analysis, database schema, REST/MCP contracts, and integer 1–5 analysis confidence semantics. Production integration questions from [issue #111](https://github.com/VENTIONINC/TestPortal-backend/issues/111) remain outside TP-1.

## Capabilities

### New Capabilities

- `jev-classification-evaluation`: Opt-in stored-result category evaluation with reusable datasets, provider metadata, local reports, and explicit separation from production analysis.

### Modified Capabilities

None. The existing capability inventory does not specify prompt evaluation behavior.

## Impact

- Evaluation code under `__prompts-tests__/stored-results-analysis/`, isolated tests under `__tests__/`, `jest.prompts.config.ts`, `.env.example`, `.gitignore`, and dependency manifests.
- Add the evaluation SDK dependency, pinned to the reference implementation's `@typesafe-ai/sdk` version `0.6.0`, and the reference default model `jev-1.13.0`, with a runner model override.
- No changes to `src/`, Prisma schema/migrations, HTTP routes, MCP tools, or production provider configuration.
- This branch currently uses stored-results prompt v1.1.0 and `gpt-4.1-mini`; the reference PR's documentation mentions a later production baseline. Documentation must describe the actual branch and must not import that unrelated production migration.
- The flow's existing `tp-1` scaffold is the planning location. Implementation and live-provider execution are separate follow-up work; paid/live runs must be reported separately from isolated checks.
