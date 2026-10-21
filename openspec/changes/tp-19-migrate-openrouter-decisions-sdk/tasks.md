# Tasks

## 1. Pin and connect the SDK

- [x] 1.1 Pin `@openrouter/sdk` to `1.4.25` in the dependency manifest and lockfile; verify installation, supported Decisions/HTTPClient imports, the current Zod compatibility export, and TypeScript/build compatibility without unrelated dependency upgrades.
- [x] 1.2 Replace direct HTTP submission in `transport.ts` with the SDK Decisions operation, mapped provider preferences, explicit Decisions origin, and disabled SDK retries; adapt the injected fetcher seam and verify SDK-backed tests assert the actual endpoint, authenticated serialized body, unchanged evidence/model, disabled fallback, and exactly one network attempt by default.
- [x] 1.3 Retain request preflight validation and document the exact SDK pin, Decisions operation, and injection boundary in the relevant adapter guidance; verify invalid credentials, unsupported payloads/options, and invalid limits fail before network access, and preserve all noul/choice/score request variants.

## 2. Preserve response validation and metadata

- [x] 2.1 Add request-local SDK response capture before body consumption, preserve original wire metadata, and validate compatibility-recovered successes against their submitted questions; verify SDK-backed missing/partial/full usage fixtures, supplied `total_tokens`, null unavailable fields, supplied zero values, and otherwise-valid 2xx/content-type variants accepted by the old transport without extra requests.
- [x] 2.2 Preserve all strict answer/model/usage validation and correlation when the SDK accepts a payload or rejects it during parsing; verify missing/extra/wrong-type answers, unknown choices, invalid distributions, score/legend mismatch, malformed JSON, and refusal/error-shaped successful bodies remain `invalid_response` and never become predictions.
- [x] 2.3 Verify concurrent submissions cannot exchange captured response bodies, usage, status, or attempt data, and document why the local validator and missing-usage compatibility path remain; remove schemas/helpers only when equivalent behavior is demonstrably covered by the SDK and existing tests.

## 3. Preserve execution policy and safe failures

- [x] 3.1 Preserve bounded timeout/retry configuration, production/evaluation zero retries, optional generic transient retries with bounded backoff/Retry-After, actual attempt counting, and full elapsed timing; verify success, exhaustion, network/timeout retries, no-request preflight failures, and permanent 400/413/authentication/invalid-response failures without evidence truncation or hidden SDK retries.
- [x] 3.2 Enforce the per-attempt deadline through SDK submission and body consumption, clearing timers and releasing captured response resources on success/failure; verify both delayed headers and delayed-body timeout cases and that zero retries produce one attempt.
- [x] 3.3 Map SDK failures using exported types and captured HTTP status into existing safe errors; verify 401/403, 402, 429, 400/413, 5xx, malformed/non-JSON HTTP error bodies, network errors, and SDK validation failures preserve kind/status/attempts, and sensitive fixtures cannot expose credentials, evidence, response bodies, or raw SDK causes in persisted errors or reports.
- [x] 3.4 Update adapter documentation for explicit SDK retry disabling, retained generic optional retries, deadline behavior, nullable usage, and safe error mapping; verify every documented behavior is covered by the focused tests from this group.

## 4. Integrate production and independent evaluation

- [x] 4.1 Update only necessary production/evaluation caller and mock adaptations while retaining the shared application adapter; run focused analysis/persistence, import/explicit-analysis, internal-field exclusion, and draft-fallback regressions to verify unchanged model/category policy, confidence mapping, stored fields, feedback precedence, public contracts, and opt-in provider selection.
- [x] 4.2 Adapt the evaluation runner/report tests to real SDK-backed transport fixtures; verify input ordering, bounded concurrency, stop-scheduling/settled in-flight failure behavior, actual request/attempt counts, requested/returned model identity, nullable usage/cost, and unchanged successful/incomplete report semantics.
- [x] 4.3 Update `__prompts-tests__/README.md` for the pinned SDK and compatibility behavior while retaining the isolated OpenAI smoke/regression commands and coverage limitations; verify mocked evaluation tests cover the documented defaults and reports without live provider access.

## 5. Integration checks and acceptance evidence

- [x] 5.1 Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`; verify all pass and review the diff for unnecessary networking/schema duplication, unrelated changes, and accidental REST/MCP/OpenAPI or database contract drift.
- [x] 5.2 Run the existing isolated OpenAI smoke and regression suites on controlled datasets using the SDK-backed implementation; inspect generated reports and record date, dataset fingerprint, model identity, actual outcomes/counts, and available usage/cost separately from mocks. If access or datasets are unavailable, record live acceptance as outstanding and leave this task unchecked.
- [x] 5.3 Exercise one representative controlled development production-path analysis using synthetic data and inspect stored analysis/metadata and sanitized public output; record the result and remaining unexercised cases separately from evaluation evidence, clean up only created data, and verify production remains opt-in. If the environment is unavailable, record the limitation and leave this task unchecked.

## Acceptance evidence (2026-10-21)

These live-provider results are separate from mocked Jest coverage.

- Final integration checks: `npm run type-check`, `npm test -- --runInBand` (73 suites, 592 tests), and `npm run build` passed. `npm run lint` exited successfully with no errors and two existing `no-explicit-any` warnings in `__tests__/services/dashboardService.aggregation.test.ts` (lines 157 and 173). `git diff --check` passed. Review found no REST/MCP/OpenAPI or database contract changes; the only unrelated working-tree item is the requested, untracked OpenSpec change directory.

- Smoke report `__prompts-tests__/stored-results-analysis/reports/openrouter/openai/smoke/2026-10-21T12-55-22-555Z-b1f358ef-079d-4ade-a728-33b05817474c.json`: dataset v1.1.0, fingerprint `sha256:a0477e18912747ca1b1bcdb869d5c68555ec3e6fbb583ab8716fd522c09f0c13`, requested model `openai/gpt-6-luna-decisions`, returned model `openai/gpt-6-luna-decisions-20261006`; 10/10 correct, 10 requests/10 attempts, usage input 5004, output 0, total unavailable, cost `$0.0005004`.
- Regression report `__prompts-tests__/stored-results-analysis/reports/openrouter/openai/regression/2026-10-21T12-55-32-321Z-2ff0a6fb-2abd-47c5-b91a-4706a4fe687e.json`: dataset v1.1.0, fingerprint `sha256:34c66419faeace41e10d7d2d976a85d9868a9e8c69077e934dc7314033b815b2`, same requested and returned model identities; 50/50 correct, 50 requests/50 attempts, usage input 25000, output 0, total unavailable, cost `$0.002500000000000001`.
- One synthetic development result passed through `storedResultAnalysisService.analyzeAndPersist`: category `other`, confidence 5, returned model `openai/gpt-6-luna-decisions-20261006`, one attempt, 607 ms, usage input 523, output 0, total unavailable, cost `$0.0000523`. Persisted metadata was present; the public projection excluded `analysisMetadata` and `analysisLastError`. The temporary project and its related records were deleted; a follow-up query found zero `codex-tp19-sdk-*` projects.
- This production-path sample covered one synthetic failed result. It does not exercise production deployment, every category/evidence shape, provider failures, or batch persistence failure. The production provider toggle and configuration were not changed; production remains opt-in.
