# Design

## Context

See proposal.md for motivation and the two capability deltas for behavior. The user selected OpenRouter instead of TP-5's original direct OpenAI requirement and explicitly excluded Microsoft from this issue. Tracker text and its historical summary remain unchanged; this change records the approved scope.

The existing TypeSafe runner already sends only diagnostic evidence, applies a five-category policy, limits concurrency to eight, and restores input order. Its suites live in `stored-results-analysis-typesafe`. The generative `stored-results-analysis` project has a broad file glob, so a new suite placed beside existing files needs explicit exclusion. `evaluation-report.ts` writes ignored timestamped and latest files but assumes numeric usage/confidence and lacks route, profile, dataset, and policy metadata. Existing specs require retaining the direct TypeSafe path.

The repository uses Node >=22.15 and Zod 3; native fetch is available. Its transitive OpenAI 6.38 SDK lacks Decisions support. The shared datasets contain 4 smoke/40 regression cases with no performance template; they remain the comparison baseline. No independent evaluation-profile implementation or Microsoft experiment exists in the inspected checkout, so this plan reuses the available TypeSafe/reporting patterns rather than assuming external PR code is present.

## Goals / Non-Goals

**Goals:** Keep the external wire boundary validated and independent of category scoring. Use the same question policy, evidence projection, and dataset identity for Jev and OpenAI. Make actual route/model/usage and failures visible in local evidence. Support testing without credentials or network access.

**Non-Goals:** Microsoft integration or evaluation; direct OpenAI Decisions transport; replacing direct TypeSafe evaluations; migrating generative calls; production classification, persistence, API changes, calibration, explanatory model chains, or expanding baseline datasets.

## Decisions

### 1. Native fetch integration with a narrow typed surface

Create a cohesive `src/lib/openrouter-decisions/` integration utility containing runtime request/answer schemas, schema-derived unions, transport, and stable error codes. Inject credentials/fetch for deterministic tests; read environment credentials at the runner boundary. Use the exact OpenRouter endpoint and send only explicitly supported fields. Transport configuration (timeout/retry) never becomes request-body fields. Reject direct OpenAI payloads and options such as temperature/maxTokens.

This avoids upgrading the production OpenAI/LangChain dependency graph or importing a new broad SDK for one endpoint. A dedicated OpenRouter SDK is an alternative, but does not remove the need for runtime correlation and distribution validation.

For this text/JSON evaluation, support string, JSON object, and JSON array state as documented by OpenRouter; media support is deferred. Use `noul` for boolean propositions, `choice` with criteria objects, and `score` with ordered criteria arrays. Return a discriminated result per named question, preserving raw valid decision metadata. Validate against the current official OpenRouter contract when implementing the boundary. The current Decisions contract does not document a refusal payload shape, so any undocumented refusal-shaped or error-shaped successful response is rejected as `invalid_response`; do not borrow a refusal shape from another API.

### 2. Explicit profiles for two models

Add evaluation-owned profiles `jev` -> `typesafe/jev-1.13` and `openai` -> `openai/gpt-6-luna-decisions`. Profile identifiers select a model, category-policy version, concurrency (default 8), timeout (default 30 seconds per attempt), and retries (default 0). Validate overrides; allow no silent model selection or fallback. Use `OPENROUTER_EVAL_PROFILE=jev|openai` to select the live suite profile, defaulting explicitly and documentably to `openai` when omitted. An invalid supplied value fails before dataset reads. Direct runners require a typed explicit profile.

Disable provider fallback using the documented OpenRouter routing field, with no model fallback list. Preserve actual upstream provider/model returned by each response; do not assume a requested alias equals a returned snapshot. Model catalog presence is not proof of account access. Microsoft receives no profile, suite, special handling, or required live probe in TP-5.

A wholly generic plugin registry is unnecessary: a typed two-profile map makes configuration reviewable and leaves room for later additions without implementing them now.

### 3. Validate at the gateway boundary

Treat external JSON as unknown. Require exact requested answer-name coverage; JSON object ordering is irrelevant. Check discriminants, criteria membership, finite bounded confidence/probabilities, complete distributions, and a sum tolerance of 1e-6 without renormalizing provider data. Validate score range and probability index keys against the supplied rubric. Do not impose undocumented relationships between confidence, winning probability, or score. Require a nonblank returned model; distinguish missing optional upstream identity from invalid supplied metadata. Keep gateway response id when supplied.

Represent missing usage/cost components as `null` with an availability marker. An explicit provider zero stays zero. Preserve actual input/output/total token values and cost when supplied; never label derived totals or estimates as actual. Aggregate a metric only when all contributing cases report it; otherwise mark the aggregate unavailable, retaining per-case values. Refusal is never `other`.

Use stable errors for configuration, authentication, credit exhaustion, rate limiting, timeout/network, upstream failure, and invalid response. Do not expose an undocumented refusal outcome. Sanitize messages and never retain request authorization headers in logs or reports.

### 4. Bounded retry and concurrency ownership

The adapter owns per-attempt abort timeout, at most three configured retries, bounded exponential backoff with a bounded Retry-After value, and retry eligibility for 429/5xx and transient network errors. Nontransient 4xx, schema violations, and invalid responses do not retry. Track logical requests separately from transport attempts and account for potentially duplicated billing when retries are enabled; default evaluations have zero retries.

The evaluation runner owns case concurrency and stable indexing. On first failure, stop allocating cases and await current workers before rejecting. Do not overwrite a prior completed latest report with a partial run labeled successful. A failed-run artifact can record failure and completed cases, but must be explicitly incomplete and excluded from comparisons. Empty direct input returns no predictions, zero actual requests, and unavailable accuracy; suites reject empty data.

### 5. Shared policy with independent selection

Add `openrouter-stored-results-analysis.ts`, `openrouter-suite.ts`, profile/policy helpers, and `openrouterTestEnv.ts` beside existing evaluation infrastructure. Use the existing Jev criteria verbatim and identical evidence projection: specKey, specTitle, status, duration, retry, executionName, errorMessage, errorStack, errorLocation. Exclude test names, tags, and expect blocks since these can reveal labels. Version this question policy and send a single `category` choice for each case.

Keep live suite files named `openrouter.smoke.test.ts` and `openrouter.regression.test.ts`; add `stored-results-analysis-openrouter-decisions` and exclude its patterns from the broad existing OpenAI project. Missing/blank OpenRouter keys skip before data reads or requests, without requiring direct-provider keys. Existing projects keep their selection and behavior. Keep mocked tests under `__tests__/prompts/` and integration-utility tests under the matching regular-test area.

### 6. Reports and same-dataset comparison

Reuse the existing report writer's timestamp/UUID/latest pattern. Prefer a separate OpenRouter report input type and thin writer over weakening the direct TypeSafe report contract or zero-filling its required fields. Extract only genuinely shared file-writing mechanics if useful, with compatibility tests for existing reports.

Write under `__prompts-tests__/stored-results-analysis/reports/openrouter/<profile>/<suite>/`. Include schema version, gateway/API mode and endpoint, profile, requested model, returned model/provider per case, dataset version and SHA-256 content fingerprint, category-policy version, predictions/mismatches, raw decision output, request/attempt counts, duration, and available actual usage/cost. Do not store credentials. Emit reports before the existing all-correct smoke/90% regression assertions.

Provide a local comparison entry point accepting the Jev/OpenAI report paths. Require matching suite, dataset fingerprint, policy version, case identities, and complete prediction sets. Keep comparisons separate from the full generative-analysis score, which also checks conclusions/error quality/confidence. Historical direct Jev reports lack required provenance; do not manufacture it or claim strict equivalence. They remain a separately described baseline unless rerun with sufficient provenance in future work.

### 7. Verification and evidence

Mock fetch at the adapter boundary for all three primitives, mixed question correlation, undocumented refusal-shaped and unknown error-shaped responses, invalid payloads/distributions/metadata, configured retry bounds and aborts. Test ordered concurrency, scheduling after failure, zero cases, missing credentials, ground-truth exclusion, profile selection, report paths, unavailable metadata, comparison provenance, thresholds, and Jest suite selection without live calls. Mocked classification fixtures cover performance and precedence request policy; they establish construction/scoring behavior, not provider accuracy.

Implementation runs focused tests and the repository type-check/lint/test/build checks, strict OpenSpec validation, and diff whitespace checks. Live smoke/regression remains explicit and opt-in. Record per-profile outcomes/report paths or state calls were not run; inaccessible accounts are evidence limitations, never a reason to substitute another model. The proposal itself makes no live-access claim.

## Risks / Trade-offs

- [OpenRouter Decisions is alpha and model capabilities can differ] -> Use narrow validated contracts, isolated fixtures, explicit profiles, and provider errors without fallback; verify each scoped profile with opt-in smoke.
- [Gateway measurements include routing overhead and gateway pricing] -> Label gateway and upstream identities and report observed duration/cost without claiming direct-provider benchmarks.
- [Mutable model aliases can resolve to different snapshots] -> Record requested and returned model identities per case and keep separate run artifacts.
- [No performance-category cases in the baseline] -> Preserve identical datasets and disclose incomplete live category coverage; defer a separately versioned diagnostic expansion.
- [Changing report helpers could break direct Jev consumers] -> Keep existing report types/shape stable and test backward compatibility.
- [Original tracker wording requires direct OpenAI and mentions Microsoft comparisons] -> This plan explicitly applies the user's OpenRouter decision and later Microsoft exclusion; do not edit tracker requirements from this workflow.

## Migration Plan

Add the adapter and opt-in evaluation files without wiring production services. Document OpenRouter credentials and profile-specific commands. Generated datasets/reports remain ignored. Rollback removes the new evaluation selection and adapter; no database migration or production configuration rollback is needed.

## Open Questions

- Does the deployment's OpenRouter account have access to each scoped model, and which upstream snapshot will it return? Establish only through explicit live probes; report unavailable access without altering scope.
- Which optional billing fields are returned per model? Preserve supplied values and availability rather than assuming parity.

## References

- OpenRouter Decisions reference: https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request
- Jev model: https://openrouter.ai/typesafe/jev-1.13
- OpenAI Decisions model: https://openrouter.ai/openai/gpt-6-luna-decisions
- Direct OpenAI comparison of wire contracts: https://developers.openai.com/api/docs/guides/decisions
