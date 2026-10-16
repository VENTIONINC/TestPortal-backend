# Design

## Context

See `proposal.md` for motivation and confirmed research scope. This change is based on `feature/tp-5`, which includes TP-1. Design is warranted because the extension spans the shared adapter, evaluation configuration, Jest project isolation, reports, and comparison compatibility.

Observed implementation:

- `src/lib/openrouter-decisions/{schemas,transport,response}.ts` already implements typed HTTP requests to the alpha Decisions route, credential checks, fallback prohibition, bounded timeout/retry, and validated named answers. No OpenRouter SDK is installed or needed.
- `openrouter-profiles.ts` contains only `jev` and `openai`; its execution overrides accept concurrency and timeout. The current runtime does not explicitly reject an extra model override.
- `openrouter-policy.ts` already matches TP-1's evidence and category precedence. `openrouter-stored-results-analysis.ts` preserves input order, bounded concurrency, and failure accounting; `openrouter-suite.ts` writes reports before checking accuracy thresholds.
- `openrouter-report.ts` stores validated answers, timestamps, per-case request duration, model/provider identity, nullable usage/cost, and dataset/policy identity under ignored profile/suite paths.
- `compare-openrouter-reports.ts` accepts only a Jev/OpenAI pair and checks matching datasets and cases. Its schema currently permits unknown report fields and does not establish the OpenRouter gateway/endpoint provenance.
- `jest.prompts.config.ts` isolates generic OpenRouter suites from direct TypeSafe and generative OpenAI. The broad generative stored-results test pattern requires an explicit exclusion for new Microsoft suite filenames.
- The durable OpenRouter specs contain TP-5-specific Microsoft exclusions. TP-4 replaces those clauses through deltas; historical TP-5 artifacts stay intact.

The model listing and endpoint reference were checked during exploration on 2026-10-16:

- [Microsoft-Decision-1](https://openrouter.ai/microsoft/microsoft-decision-1) lists `microsoft/microsoft-decision-1`, decision-only output, and mutable weights.
- [OpenRouter Decisions reference](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request) documents `state`, named `questions`/`answers`, choice confidence/probabilities, usage/cost, and HTTP 413.

These references support extending the existing typed HTTP integration. They do not establish live account access or measured accuracy; no live inference ran during planning.

## Goals / Non-Goals

**Goals:** Reuse one policy and execution pipeline for all three OpenRouter models; isolate Microsoft suite selection; produce comparable research evidence while preserving existing two-profile commands.

**Non-Goals:** Direct-provider comparison, a new SDK, production model selection, complete provider response capture, dataset expansion, or statistical claims from a single evaluation run. Existing direct-provider suites remain available independently.

## Decisions

### 1. Extend the existing profile and adapter boundary

Add `microsoft` mapped to `microsoft/microsoft-decision-1` in `openrouter-profiles.ts`, preserving the existing two models, concurrency 8, timeout 30 seconds, and zero retries. Reuse the current runner and category question without provider-specific policy forks. Reject unsupported evaluation configuration keys such as `model` at the runtime options boundary; keep the generic adapter's explicitly supplied model support.

Alternative: duplicate the adapter/runner for Microsoft. Rejected because wire format and category workflow already match, and duplication would risk divergent evidence and validation. Upgrading or adding an SDK offers no required capability here.

### 2. Provide dedicated Microsoft suites with fixed selection

Create `microsoftDecisionTestEnv.ts` and `v1.1.0/microsoft-decision.smoke.test.ts` / `microsoft-decision.regression.test.ts`. Add the `stored-results-analysis-microsoft-decision` Jest project with exact Microsoft file matching. The Microsoft environment uses only `OPENROUTER_API_KEY` and always selects `microsoft`; `OPENROUTER_EVAL_PROFILE` continues to control only the existing Jev/OpenAI project with its current default.

Exclude Microsoft filenames from the existing broad generative project. Microsoft suites skip missing/blank credentials before dataset reads or network activity; direct runner calls still reject missing credentials. Use the same generated smoke/regression files, preserving 100% smoke and 90% regression acceptance. Dataset generation runs once before all compared evaluations.

Alternative: select Microsoft through the existing generic project alone. Rejected because TP-4 explicitly requires a separate project and predictable independent suite selection.

### 3. Retain validated answers and existing report format

Continue storing the validated choice answer, confidence, and category probabilities with the existing report metadata. The existing `rawAnswer` field means the validated provider answer, not a complete HTTP JSON response. Reuse `reports/openrouter/microsoft/<suite>/` and timestamped plus `latest.json` output. Retain unavailable billing fields as `null`; neither infer costs from a price list nor fill unavailable usage with zero.

No full response logging, additional archive, or production confidence conversion is introduced. Keep policy and dataset versions unchanged because their semantics are unchanged. Requested and returned model identifiers remain separate; timestamps disclose when mutable model aliases were evaluated.

Alternative: retain complete response bodies for debugging. Rejected by the confirmed research scope.

### 4. Add an explicit three-report comparison without breaking the pair

Extend `compareOpenRouterReports` and its file wrapper with an optional third Microsoft report. Two arguments retain the existing pair result, including `openaiMinusJev`; three arguments return all three summaries and add Microsoft-minus-Jev and Microsoft-minus-OpenAI differences. The CLI accepts exactly two or three file paths, in Jev, OpenAI, Microsoft order; an invalid supplied third path fails rather than silently reverting to pair mode.

Three-model mode requires supported schema version 1, `gateway: openrouter`, the expected alpha Decisions endpoint/API mode, expected profile and pinned requested model, matching suite/dataset version/fingerprint/policy, and identical complete unique case identities/labels. Recompute correctness/counts/accuracy from cases. Reject incomplete or inconsistent runs and duplicate/missing profiles. Validate per-case duration and existing nullable metrics before summarizing them. Do not retrofit historical direct TypeSafe reports with invented provenance.

For each model expose accuracy, mismatch cases, total duration, mean per-case request duration, request/attempt counts, actual usage/cost, evaluation timestamp, and requested/returned model identity. Whole-run duration includes concurrent execution; mean per-case duration includes gateway/provider overhead. The existing pair output remains unchanged; additional latency/identity fields are required in three-model summaries. Differences involving an unavailable metric remain `null`. Output supports human judgment and never selects a production winner.

Alternative: replace the pair API with an unrestricted collection comparator. Rejected as unnecessary compatibility and interface churn for a fixed three-model research question.

### 5. Treat input-limit rejection as failed evidence collection

Retain HTTP status and actual attempts for HTTP 413 and context-limit HTTP 400. Both are permanent request failures under existing retry rules. Add focused regression tests; introduce no evidence truncation, token estimation limit, or automatic alternative model. Existing `upstream` error classification with status is sufficient unless a stable input-limit kind is needed for an existing consumer; no such consumer was found.

Keep the current malformed-answer, distribution, named-answer, and error-body validation. A failed Microsoft run settles in-flight requests, rejects, and creates no completed-success report. It must never use an old `latest.json` as evidence for a newly failed run; live evidence records exact timestamped files.

## Risks / Trade-offs

- Alpha API and mutable model aliases can change behavior -> retain request/returned identity and evaluation dates; report access and failures separately from mocked checks.
- Shared v1.1.0 datasets contain 4 smoke and 40 regression cases without performance examples -> disclose the coverage gap; keep this baseline stable for comparison.
- Gateway-inclusive timing and individual run variance can obscure model differences -> label per-case and whole-run durations precisely, use equal execution settings, and avoid claims of direct-provider latency or statistical significance.
- A report's provenance metadata is a consistency guard, not cryptographic proof -> compare only local reports from the documented evaluation commands; do not invent missing historical metadata.
- Existing specs exclude Microsoft -> replace those exact clauses in the two capability deltas while preserving unrelated requirements and scenarios.

## Migration Plan

No database or production deployment migration is required. Add profile/project support, extend comparison mode, then document the research commands. Existing Jev/OpenAI and direct-provider commands remain available. Rollback removes the Microsoft project/profile and three-report extension; generated reports remain ignored local research artifacts. Live evaluation is opt-in and delivery records whether it ran, including exact report paths and limitations when available.
