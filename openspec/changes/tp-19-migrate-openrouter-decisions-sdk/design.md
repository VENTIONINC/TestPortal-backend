# Design

## Context

See `proposal.md` for motivation and scope. `transport.ts` currently validates inputs, builds authenticated JSON with `fetch`, bounds attempts and timeouts, and returns raw JSON plus attempts and elapsed milliseconds. `response.ts` strictly validates the response and correlates every answer against its request. Production `testAnalysisService` and the isolated OpenAI evaluation runner share this boundary. Production requests use 30 seconds and zero retries; evaluation defaults match and allow bounded timeout/concurrency overrides. The generic adapter also supports up to three explicit retries with bounded backoff and Retry-After handling.

Read-only inspection of the published npm tarball for `@openrouter/sdk@1.4.25` on 2026-10-21 confirmed:

- `OpenRouter.alpha.decisions.create({ decisionsRequest }, options)` and the equivalent exported functional operation `alphaDecisionsCreate` target `https://openrouter.ai/api/alpha/decisions`.
- The operation defaults to backoff retries, including connection errors, with a one-hour maximum elapsed retry window. Timeout defaults are unsuitable for our contract. Both must be overridden explicitly.
- The SDK serializes camelCase request properties such as `allowFallbacks` into wire names. Its request schemas do not enforce all application restrictions.
- Response parsing requires `usage` with input/output token counts, renames them to camelCase, and drops unknown fields such as `total_tokens`. Choice confidence and probabilities are optional in the SDK and lack our correlation/distribution checks.
- The public `HTTPClient` supports an injected fetcher, `beforeRequest` and `response` hooks, and response cloning. `ResponseValidationError` retains raw values and potentially sensitive HTTP data. The SDK matcher consumes the response body; cloning must occur before that.

Authoritative evidence: [published package metadata](https://registry.npmjs.org/@openrouter%2fsdk/1.4.25), and the versioned package files `esm/funcs/alphaDecisionsCreate.js`, `esm/models/decisionsresponse.js`, `esm/models/decisionschoiceanswer.js`, `esm/lib/http.js`, and `esm/lib/matchers.js`. The package was inspected without installation. These findings are not live API acceptance.

The existing adapter, evaluation, and production categorization specs remain authoritative. The user explicitly confirmed that otherwise-valid responses without usage must continue to succeed. No higher-level architecture is linked by TP-19; the user selected `userstory/tp-7` as the origin branch.

## Goals / Non-Goals

**Goals:** Let the SDK own HTTP serialization, authorization, and submission; preserve the application's stricter contract and existing consumers; prevent SDK defaults or response transforms from changing behavior; keep the compatibility logic request-local and reviewable.

**Non-Goals:** Change public APIs, data storage, evidence construction, category instructions or precedence, confidence mapping, model selection, production enablement, or the independently generative issue-draft fallback. Do not remove documented optional generic retries merely because production and evaluation use zero.

## Decisions

### 1. Exact SDK pin behind the existing boundary

Add exact dependency `@openrouter/sdk: 1.4.25` with the lockfile. Keep `submitOpenRouterDecision`, its domain error class, and its result contract as the integration boundary. Use the SDK Decisions operation with explicit credentials, the validated request mapped into SDK types, and provider `allowFallbacks: false`. Explicitly target the Decisions origin at the operation level rather than relying on a generic `/api/v1` base URL or an environment URL override.

Prefer the public SDK surface and exported HTTP client over generated internal helpers or patched package files. Use supported ESM imports compatible with the repository's current TypeScript/Jest/build configuration. Check the SDK's `zod/v4` imports against the installed `zod@3.25.76` compatibility export rather than upgrading Zod or changing module resolution speculatively.

Alternative: letting services use SDK response and error classes directly would spread its transformations and sensitive error objects across application and evaluation code. Retaining the local boundary limits change and keeps REST/MCP contracts unaffected.

### 2. Preserve the original success payload through a response hook

Create an SDK HTTP client per submission, with response/attempt state owned by that submission and reset for each optional retry. A response hook records status/Retry-After and captures a clone of successful responses before SDK parsing consumes the body. Do not register per-request state on a global client; production and evaluation both run concurrently.

After the SDK operation settles, parse the captured successful body as `unknown` and pass the original wire payload through the existing strict response validator and request correlation checks. Use that payload for the local transport result so consumers retain the current snake_case contract and `total_tokens` is not lost. On SDK `ResponseValidationError` for an HTTP success, recover only when the original payload passes the complete application validation. This covers absent/partial usage without inventing fields or weakening answer validation. SDK parse failure must never cause a second provider request. Preserve the original 2xx JSON success semantics when the SDK rejects only a status/content-type mismatch, using the captured status and application validation; non-2xx responses never enter this compatibility path.

Malformed JSON, unknown fields rejected by the existing strict schema, invalid/missing answers, missing confidence/distributions, unknown choices, invalid model/usage values, and undocumented refusal/error-shaped payloads remain `invalid_response`. Never modify the provider response to satisfy SDK parsing, synthesize token counts, use SDK-stripped output as the only validation source, or return an unvalidated raw value. Keep raw clones and SDK error bodies ephemeral and outside logs, persistence, public responses, and reports. Release response resources after validation, including failed attempts.

Alternative: relying exclusively on SDK parsing rejects currently valid missing-usage responses and loses supplied metadata. Fabricating a usage object violates the confirmed contract. A small response hook avoids a second HTTP implementation while preserving the original payload.

### 3. One owner of retry and deadline policy

Set SDK retries to `{ strategy: "none" }` on every Decisions operation, including optional retry attempts. Production remains one request with a 30-second deadline. Preserve the generic adapter's validated `timeoutMs` and `maxRetries` bounds, transient-only retry policy (429/5xx and network/timeout), bounded backoff, Retry-After cap, and actual attempt counts; keep the minimal outer policy needed because the SDK's elapsed-time retry strategy does not implement our count-based contract. Evaluation continues to select zero retries.

Apply one per-attempt deadline through request completion and response-body consumption. SDK request timeout support does not by itself establish this guarantee: if necessary retain a small AbortController deadline around the SDK call and captured-body read, passing the signal through the SDK and clearing it in `finally`. Ensure that the SDK timeout and signal cannot create competing retry/deadline owners. Test a response that returns headers promptly but delays its body. No silent evidence truncation or retries on 400/413, authentication, input validation, or invalid responses.

Count actual outgoing attempts through the SDK HTTP client's request hook, with zero for application/SDK preflight failures. Measure elapsed time around the complete submission, including configured retry backoff and parsing, as today. No invented counts based on configured retry limits. Retain only timing/deadline and optional retry policy code that the SDK cannot faithfully replace; remove direct request URL/header/body construction and direct production `fetch` invocation.

### 4. Stable safe errors at the integration boundary

Map by captured HTTP status and exported SDK error types, not message substring matching. Retain 401/403 authentication, 402 credit, 429 rate_limit, timeout, network, configuration, upstream, and invalid_response behavior. HTTP status takes precedence when SDK error-body validation fails: malformed 401/400/413/5xx error bodies must not be misclassified as successful-response validation errors. Distinguish deadline abort from network failure and preserve attempts/status.

Convert SDK failures to the existing safe application error messages before leaving the adapter. SDK errors may contain request headers, raw body, and submitted evidence; never expose or log their message, pretty output, request/response objects, or raw cause. Keep the existing sanitized persistence mapping and error kinds. Do not introduce undocumented refusal detection.

### 5. Retain validation that expresses application policy

Keep local request constraints and response correlation (all noul/choice/score variants), finite/range checks, exact keys, normalization tolerance `1e-6`, score rubric validation, and truthful nullable usage. The current schemas are stricter than the SDK and are not redundant solely because generated SDK types exist. Derive application types from their owning schemas; use SDK-generated types only at the conversion boundary. Remove a schema/helper only after documenting equivalent SDK coverage and preserving its behavior tests.

No new module is mandatory. Extract a cohesive error or metadata helper only if it simplifies ownership and avoids circular dependencies; do not create parallel production/evaluation adapters.

### 6. SDK-backed verification and acceptance

Keep deterministic transport coverage by injecting the fetcher into the SDK's public HTTPClient (the existing `fetchImpl` option may remain as a thin test seam). Tests should exercise the real SDK serialization, parsing, response hook, and error behavior with fake network responses; mocking `decisions.create` alone cannot establish the migration's correctness. Adapt fixtures to the SDK's `Request`-based invocation and actual body/content-type semantics rather than assuming `(url, init)` arguments.

Cover missing/partial/full usage, retained supplied `total_tokens`, zero vs unavailable metrics, correlated answers across all variants, SDK parser compatibility recovery, malformed successful bodies, HTTP error bodies, nondefault success content types/statuses accepted by the old adapter, zero-request configuration failures, single-attempt production/evaluation requests, optional generic retries, deadline/body timeout, and concurrent submissions without cross-request metadata leakage. Test sensitive SDK failure fixtures against the existing sanitized persistence/report boundary.

Run the existing production analysis/persistence, upload/explicit-analysis, public-field exclusion, and generative draft-fallback regressions without broadening business behavior. Update the evaluation mocks and verify incomplete runs never produce a completed-success report; successful reports preserve accuracy, ordering, fingerprints, model identities, counts, and nullable usage.

Implementation acceptance includes type-check, lint, regular Jest tests, and build. Run the isolated existing OpenAI smoke/regression suites with controlled diagnostic datasets and record actual results separately from mocks. Use a representative controlled development production-path request to verify the SDK-backed classifier and stored metadata; do not repeat the entire TP-7 acceptance matrix or alter pre-existing user data. No live credentials or production rollout is implied by this planning run. If credentials, datasets, or the development environment are unavailable, explicitly record the outstanding live acceptance rather than equating mocks with live success.

## Risks / Trade-offs

- [SDK schema drift] -> exact version pin, SDK-backed fixtures, and an explicit missing-usage/raw-metadata compatibility path; upgrades require repeating this comparison.
- [More validation than a naive SDK wrapper] -> retain only checks required by the existing application contract; remove networking duplication rather than weaken runtime validation.
- [Raw response clones consume memory] -> scope capture to one bounded attempt, settle/release bodies, and do not retain provider bodies after validation or include them in reports.
- [Timeout ends at headers rather than body] -> enforce and test the per-attempt deadline through body consumption.
- [ESM/Jest integration or Zod export mismatch] -> verify the real pinned dependency with the existing toolchain early; keep any necessary configuration change narrowly scoped.
- [SDK errors contain secrets] -> map at the adapter boundary and verify sanitized persisted/reported output using sensitive fixtures.
- [Mutable model aliases and small datasets] -> record actual date/model identity and retain evaluation coverage limitations without claiming reproducible full-category performance.

## Migration Plan

1. Implement on `userstory/tp-19-migrate-openrouter-decisions-sdk`, based on `userstory/tp-7`; pin the dependency and establish SDK-backed compatibility tests.
2. Replace submission internals, integrate consumers and evaluation mocks, and remove only verified redundant code. No database migration or backfill is required.
3. Run required checks and isolated live evaluations/representative development acceptance, recording their evidence separately. Preserve the opt-in production flag and existing secret configuration.
4. Deploy through the existing release process only when separately authorized. Roll back by reverting the SDK migration/dependency lock changes; retain existing database contents and provider-selection configuration. Do not change models or automatically enable Decisions during deployment.
