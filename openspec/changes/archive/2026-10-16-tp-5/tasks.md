# Tasks

## 1. OpenRouter decision boundary

- [x] 1.1 Implement request schemas and schema-derived types in `src/lib/openrouter-decisions/` for text/JSON state and named noul/choice/score questions, using the current official OpenRouter contract; verify mocked tests accept valid primitives and reject direct OpenAI payloads, invalid criteria, blank models, and generative-only options before fetch. Create supported source/test files with `npm run new:file -- <path>`.
- [x] 1.2 Implement authenticated native-fetch transport with injected fetch/credentials, validated timeout and retry limits, and disabled automatic fallback; verify exact endpoint/body/header construction, missing/blank credentials, no direct-provider credential fallback, and zero-retry single-attempt behavior with mocked fetch.
- [x] 1.3 Implement response validation and named question correlation, including probability distributions, score bounds, returned model, optional upstream identity, and supplied usage/cost; verify mixed-question, missing/extra-name, type/category mismatch, nonfinite/out-of-range values, invalid distribution, and unavailable-metadata fixtures without synthesizing provider data.
- [x] 1.4 Implement stable sanitized provider-error and invalid-response outcomes, per-attempt abort, bounded retry/backoff for transient failures, and attempt accounting; verify undocumented refusal-shaped/unknown error-shaped answers become invalid responses, malformed JSON, auth/credit/rate-limit/network/5xx failures, timeout abort, retry limits, and credential exclusion through mocked tests.
- [x] 1.5 Document the adapter's OpenRouter alpha contract, supported primitives, credentials, routing, timeout/retry defaults, validation, and failure behavior in the prompt-evaluation documentation; verify examples match the implemented types and explicitly distinguish the direct OpenAI wire contract.

## 2. Scoped profiles and category runner

- [x] 2.1 Add `jev` and `openai` evaluation profiles mapped to `typesafe/jev-1.13` and `openai/gpt-6-luna-decisions`, plus validated profile/concurrency/timeout overrides; verify profile selection, unknown-profile rejection, explicit requested models, zero retry defaults, and no Microsoft profile in focused tests.
- [x] 2.2 Add a versioned category-question policy and evidence projection matching existing Jev definitions and precedence; verify outgoing requests contain only the nine approved diagnostic fields and the named five-category choice, never names/tags/expected labels or production confidence constraints. Include mocked performance/infra-precedence and ambiguous-evidence construction fixtures without claiming model accuracy.
- [x] 2.3 Implement the shared OpenRouter stored-result runner with stable input ordering, bounded concurrency, scheduling stop on first failure, in-flight settling, and empty-input handling; verify delayed/out-of-order mock responses, concurrency ceiling, failure/invalid-response propagation, zero calls and unavailable accuracy for empty input, and direct missing-credential rejection.
- [x] 2.4 Document profile invocation and category-only semantics alongside the runner, including unchanged direct TypeSafe behavior, five-category precedence, the existing 4/40 baseline, and absent performance-category live coverage; verify documented profile identifiers and configuration values match tests.

## 3. Reports and comparison

- [x] 3.1 Add OpenRouter-specific report contracts and compatible reuse of timestamped/latest file-writing mechanics; verify profile/suite path separation, schema/version/fingerprint/policy metadata, per-case requested/returned model and upstream identity, raw answers, actual request/attempt counts, usage/cost availability, and credential exclusion in temporary-directory tests. Keep existing TypeSafe report tests passing.
- [x] 3.2 Add a shared suite wrapper that rejects empty datasets, reports completed predictions before asserting all-correct smoke/90% regression thresholds, and excludes refusal-shaped invalid/partial runs from complete-success reports; verify all-correct smoke, exact 90% boundary, below-threshold report persistence, and execution failures with mocked runner results.
- [x] 3.3 Add a local Jev-versus-OpenAI report comparison entry point requiring matching suite, dataset fingerprint, policy version, and complete case identities; verify compatible summaries and rejection of dataset/policy/case/partial-run mismatches, retaining unavailable metrics rather than zero-filling them.
- [x] 3.4 Document report paths, comparison command, raw probability interpretation, unavailable billing metadata, gateway latency/cost limitations, and historical direct Jev report provenance limitations; verify the documented comparison command against synthetic reports.

## 4. Opt-in live suite isolation

- [x] 4.1 Add `openrouterTestEnv.ts` and the profile-driven `openrouter.smoke.test.ts`/`openrouter.regression.test.ts` suites, with `OPENROUTER_EVAL_PROFILE=jev|openai` and documented default `openai`; verify missing/whitespace credentials skip before dataset reads/network, invalid supplied profiles fail clearly, and direct-provider keys are unnecessary using deterministic environment tests.
- [x] 4.2 Register `stored-results-analysis-openrouter-decisions` in `jest.prompts.config.ts` and exclude its files from the broad existing OpenAI project; verify Jest selection lists and isolated mocked harness tests show no OpenRouter live suite in ordinary, generative OpenAI, or TypeSafe project selection.
- [x] 4.3 Add credential placeholders to the existing environment example and exact dataset-generation, per-profile smoke/regression, and comparison commands to `__prompts-tests__/README.md`; verify no credentials enter tracked files and generated datasets/reports remain ignored. Explicitly document that Microsoft is outside TP-5.

## 5. Integration verification and delivery evidence

- [x] 5.1 Run the focused adapter/runner/report/suite-isolation tests and existing TypeSafe evaluation tests, then `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`; verify every required check passes and review the diff for unchanged production services, Prisma, REST/MCP, and direct-provider evaluation contracts.
- [x] 5.2 Record actual live-access and smoke/regression evidence separately for Jev and OpenAI: when explicitly enabled, run both profiles on the same generated dataset files and produce the comparison; otherwise record that live calls were not run, or name access/provider failures without substitution. Verify any reported results reference real ignored report paths and do not claim unmeasured accuracy or Microsoft coverage.
- [x] 5.3 Run `openspec validate tp-5 --strict` and `git diff --check`, inspect all added artifacts/files, and verify no generated datasets/reports or credentials are tracked; deliver a concise verification record distinguishing mocked checks from live outcomes.
