# Design

## Context

See `proposal.md` for motivation and the `jev-classification-evaluation` delta for the behavior contract. TP-1 has no parent architecture. Its sources are [PR #113](https://github.com/VENTIONINC/TestPortal-backend/pull/113) and [issue #111](https://github.com/VENTIONINC/TestPortal-backend/issues/111); the latter's production design questions are explicitly outside this ticket.

Observed on this branch:

- `jest.config.ts` excludes all prompt suites from ordinary tests. `jest.prompts.config.ts` has two projects and a broad stored-results-analysis matcher that would also collect newly added TypeSafe suites unless narrowed.
- The existing runner returns `TestAnalysisResponse`, validates conclusions/error quality, and uses `gpt-4.1-mini`. Its v1.1.0 datasets already define the five categories and failed/flaky inputs.
- `__prompts-tests__/testEnv.ts` throws without `OPENAI_API_KEY`; Jev suites cannot import it.
- Neither `runners/evaluation-report.ts` nor generated-report ignore rules are present. `compare-versions.ts` calculates in-memory comparison metrics but does not provide the report writer imported by PR #113.
- Production uses prompt v1.1.0 and integer confidence 1–5. The later production baseline described in PR #113 is not this branch's baseline.

## Goals / Non-Goals

**Goals:** Keep experiment code in the evaluation tree; share dataset types and a provider-neutral local report format; support deterministic SDK-mocked verification; retain the reference category policy, model default, and acceptance thresholds.

**Non-Goals:** Runtime provider routing, hybrid explanatory analysis, confidence calibration, result persistence, database migrations, API/UI changes, review/feedback changes, new datasets, production prompt/model upgrades, and similar-error matching. Extending OpenAI evaluations to collect new token telemetry is also outside this change; the report helper is reusable without modifying that runner.

## Decisions

### 1. Adapt the reference in evaluation code only

Add `runners/typesafe-stored-results-analysis.ts`, importing `Category`, `TestCase`, and `TestInput` from the existing v1.1.0 templates and reusing `EvalFailure`. Add the pinned `@typesafe-ai/sdk` version `0.6.0` and matching lockfile entry, as used by PR #113. Use `TypeSafeClient.systemOne` with a `choice` question, default model `jev-1.13.0`, and an optional model override. The default is a reproducibility choice from the reference, not a claim about the latest provider offering or its current availability.

Send the result fields from `TestInput`, normalizing missing error fields to null. Never send `expect` or ground-truth labels. Encode the reference criteria and priority `infra > performance > script > bug > other`, with an explicit fallback for insufficient/conflicting evidence. Category predictions have a separate result type; they do not implement or fabricate `TestAnalysisResponse` fields.

Alternative: adapt the existing full-analysis runner or add a runtime service. Rejected because its validation and response semantics assume conclusions, error quality, and integer confidence that Jev does not supply.

### 2. Preserve input association while bounding requests

Use the reference worker-pool approach with default concurrency eight and indexed output slots so out-of-order completion does not reorder predictions. Validate concurrency as a positive finite integer before provider work. Aggregate category mismatches, duration, token counts, and one request per successfully classified case. Preserve raw provider confidence and all five probabilities without calibration. Reject provider errors; do not publish a complete success report for a partial run. Do not add application-level retries, which would invalidate the one-request-per-case metric.

For an empty case list, return empty predictions/failures, zero usage and requests, and reference-compatible accuracy 1 without constructing a client. Live suites must assert nonempty datasets so this convention cannot create false acceptance evidence. Validate credentials before direct runner execution, including empty input.

Alternative: unbounded parallel calls. Rejected to avoid burst traffic; sequential execution is supported with concurrency one but is not the default.

### 3. Isolate collection and environment setup

Add `v1.1.0/typesafe.smoke.test.ts` and `typesafe.regression.test.ts`, plus `typesafeTestEnv.ts` to load dotenv without importing the OpenAI credential guard. Add the `stored-results-analysis-typesafe` project with an explicit TypeSafe matcher, and exclude those files from the existing stored-results-analysis project. Keep ordinary Jest's prompt exclusion.

Live suites choose `describe` or `describe.skip` using a trimmed TypeSafe key before loading datasets inside their test callbacks; the runner independently rejects missing/blank credentials before client construction. This intentionally improves PR #113's import-time credential error so uncredentialed prompt collection remains usable. Selecting all prompt projects with a configured TypeSafe key can run these suites; document project selection as the way to control provider execution, and that a configured key enables the TypeSafe project in all-project runs.

Alternative: import the existing prompt environment module. Rejected because Jev would incorrectly depend on `OPENAI_API_KEY`. A separate new provider-enable environment flag is unnecessary for the ticket's key-and-project opt-in convention.

### 4. Supply the missing reusable report helper

Add `runners/evaluation-report.ts` with typed provider-neutral usage, per-case, and report structures matching the fields PR #113 consumes. Write reports beneath `__prompts-tests__/stored-results-analysis/reports/<provider>/<suite>/` with timestamped filenames and `latest.json`; return both paths for logging. Use local metrics and predictions only, never credentials or the whole process environment. Write reports before suite accuracy assertions. Add `__prompts-tests__/**/reports/` to `.gitignore` outside the managed block.

Smoke uses all-correct category acceptance and a 120-second timeout; regression uses at least 90 percent accuracy and a 300-second timeout, matching the reference. Report helper tests write to an isolated temporary directory and clean up their own files. No checked-in generated reports or fabricated benchmark results.

Alternative: copy the missing reporting infrastructure's entire upstream branch. Rejected because that would pull unrelated production changes into this evaluation ticket. A narrow report helper supplies exactly the evaluation dependency needed here.

### 5. Separate deterministic verification from live evidence

Add ordinary tests under `__tests__/prompts/` for the SDK-mocked runner and report helper. Verify input mapping, exclusion of expectations, order under concurrent completions, model override/default, mismatches, usage, empty input, invalid concurrency, credential guard, raw metadata preservation, and provider errors. Use mocked environment values only within isolated tests and restore environment changes. Check Jest collection boundaries and missing-key suite skip without network traffic.

Document `TYPESAFE_API_KEY` in `.env.example`, commands and limits in `__prompts-tests__/README.md`. Use these commands after generating existing datasets:

```sh
npx tsx __prompts-tests__/stored-results-analysis/generate-datasets.ts
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis-typesafe --testPathPattern='typesafe\.smoke\.test\.ts$'
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis-typesafe --testPathPattern='typesafe\.regression\.test\.ts$'
```

Live provider execution is optional delivery evidence and must be recorded separately. Passing mocked tests does not prove the reference model is available or meets live accuracy thresholds.

## Risks / Trade-offs

- [Reference SDK/model may no longer be available] → Verify package compatibility during installation; leave live availability unverified unless executed. Do not silently substitute a model or report mocked output as live evidence.
- [Shared synthetic datasets have limited category coverage] → Report accuracy only for the existing dataset; representative-data expansion and production readiness belong to separate research.
- [Raw confidence resembles production confidence] → Keep distinct evaluation types and explicitly document that provider confidence/probabilities are not the integer 1–5 analysis scale.
- [Adding a broad Jest matcher causes unexpected calls] → Test collection boundaries, separate environment setup, and missing-key skips; document all-project behavior when a key is configured.
- [Provider failures leave other in-flight requests] → Bound concurrency and reject the run; do not claim a successful complete benchmark. Cancellation and partial-run report formats are outside this reference reproduction.
- [Generated reports become tracked] → Ignore the reports subtree and verify representative paths with `git check-ignore`.

## Migration Plan

No database or production rollout is required. Install the pinned dependency, add evaluation modules/tests/configuration/documentation, and run isolated plus repository checks. Operators generate datasets and explicitly select the provider project for live experiments. Rollback removes these evaluation additions and the SDK dependency; local ignored reports require no database cleanup.
