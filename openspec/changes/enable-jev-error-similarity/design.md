## Context

See proposal.md for motivation. The recorded evaluation baseline, raw results and frozen input fixtures are in [docs/evaluations/error-similarity](../../../docs/evaluations/error-similarity/README.md). Single and bulk review both reach `runReview`; it currently combines Prisma queries, weighted string comparison and assumption persistence. It scans up to 100 recent errors of the same type with assumptions, stops at the first score >= 0.7 and does not scope candidates by project. The shared Jev evaluation uses original messages and normalized log/stack arrays with a Noul judgment. Configuration is loaded centrally; TypeSafe SDK is already present in the working tree.

## Goals / Non-Goals

**Goals:** Make provider choice an explicit server deployment decision, preserve review response shapes and unconfirmed suggestions, bound external work, and prevent cross-project linking.

**Non-Goals:** Per-user/project/UI settings, embeddings or a new retrieval index, changing classification prompts, automatic confirmation, migrations, tuning on this evaluation set, or repairing unrelated legacy scoring quirks.

## Decisions

1. **Server flag and conditional validation.** Add `ERROR_SIMILARITY_AI_ENABLED` to central configuration. Missing means false; accept trimmed case-insensitive true/false and reject other explicit values. When true, require a trimmed non-empty `TYPESAFE_API_KEY` after dotenv loading and before accepting traffic. Do not make a network request at startup to validate credentials. When false, neither construct the Jev client nor require its key. This avoids accidental activation and retains a simple rollback. The flag names the AI-assisted capability rather than Jev: a future hybrid implementation can use the same opt-in. Jev is the initial internal implementation, while TYPESAFE_API_KEY remains provider-specific. A multi-provider string setting and runtime UI toggle are unnecessary for the current two modes; hybrid matching itself is outside this change.

2. **Shared project-scoped orchestration.** Resolve the target through result/execution and spec project ownership; reject absent or inconsistent ownership without writes. Move candidate access into a model and orchestration into the result-error service (a compatibility wrapper for existing callers is acceptable). Both modes fetch at most 100 latest candidates with the same type, exclude the target, and require candidate execution, spec and eligible issues to belong to the target project. Filter nested assumptions as well as the candidate query: a corrupt cross-project association must never be propagated. Stable order is createdAt descending then id ascending. Retain the legacy length gate, 0.7 weighted score, first-match and assumption priority only in legacy mode. Broad retrieval changes are deferred so this remains bounded and reviewable.

3. **Jev adapter and selection.** A dedicated adapter accepts typed error pairs without Prisma access. Extract the evaluated question and input normalization into a shared production module used by the live evaluation to avoid prompt drift. Pin `jev-1.13.0`, threshold 0.8 and question version in code initially; do not reuse prompt-test environment overrides for production. Supply only type, original message, normalized callLog and callStack. No legacy message-length gate or string threshold precedes Jev. Evaluate every eligible candidate, validate finite probabilities in [0,1], and select the maximum at or above 0.8; ties use candidate retrieval order. Prefer a confirmed same-project assumption for that candidate; otherwise select the highest-score same-project assumption with id ascending for ties. This improves Jev selection without silently changing legacy behavior. Probability becomes the new suggestion's score; it does not prove common root cause.

4. **Persistence and existing assignments.** Keep `madeBy=bot` and `isConfirmed=false`. Existing target assumptions are preserved; Jev mode skips external scoring when any already exists. Recheck inside a transaction while locking the target row before creating a suggestion, to prevent overwriting concurrent user assignments or duplicate bot suggestions. Do not hold a database transaction during external calls. Revalidate the chosen candidate/issue relationship and project scope before insertion; disappearance or changed eligibility produces no new suggestion.

5. **Bounded, explicit failures.** Use a reused server-only client, maximum four concurrent pair requests, 10-second per-request timeout, no SDK retries and a 30-second overall deadline per error review. Pass cancellation through queued/in-flight work and stop scheduling after a failure. Any failed, timed-out, unauthorized, rate-limited or malformed response aborts that error's evaluation before persistence; do not choose a winner from partial scores or silently switch algorithms. Single review uses the existing error path; bulk review records that item as failed and continues other items. No candidates or no qualifying scores are successful no-match results. An automatic legacy fallback was rejected because it would hide outages and reintroduce known false matches.

6. **Operational visibility.** Log selected provider, model/question version, candidate count, elapsed time, usage totals when returned, outcome and sanitized failure category. Do not log API keys, authorization headers, complete request/response bodies or error traces. Document TypeSafe transfer of error content, external request budget and the fact that scored probability differs from the legacy similarity score. Existing API response shapes remain unchanged.

## Risks / Trade-offs

- Synthetic 31/34 accuracy may not generalize; generic symptoms produced false matches → retain unconfirmed suggestions, explicit opt-in and shared evaluation, then validate on independently labeled history.
- Up to 100 pair requests add cost and may exceed the review deadline → bounded concurrency/deadline, usage monitoring, no partial persistence; future retrieval optimization is a separate change.
- A 0.8 threshold missed a positive at 0.79 → keep the evaluated threshold for initial rollout; tune only with held-out data in later work.
- Unconfirmed source assumptions can propagate mistakes → preserve compatibility with source data, prefer confirmed links, and leave new links unconfirmed.
- Project scoping changes behavior even when disabled → intentional correction with cross-project regression tests; no migration of historical links in this change.
- Invalid or expired server credentials are discovered on first API call → fail that review visibly, never fall back silently.

## Migration Plan

1. Deploy with the flag absent/false and run normal verification. No schema migration is required.
2. Provision `TYPESAFE_API_KEY` through the existing server secret mechanism; never commit a real value or expose it to clients.
3. Set `ERROR_SIMILARITY_AI_ENABLED=true`, restart the server and smoke-test both single and bulk review with same-project candidates.
4. Monitor latency, failures, usage and user-confirmed suggestion quality.
5. Roll back by setting the flag to false and restarting. Existing suggestions remain; project isolation remains enabled in either mode.
