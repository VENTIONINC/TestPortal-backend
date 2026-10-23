## 1. Server configuration

- [ ] 1.1 Add and validate `ERROR_SIMILARITY_AI_ENABLED` (default false) after environment loading; require non-empty `TYPESAFE_API_KEY` only when enabled.
- [ ] 1.2 Test default/false/true, whitespace and case handling, invalid flag values, missing/blank credentials and absence of provider initialization in disabled mode.

## 2. Project-scoped review orchestration

- [ ] 2.1 Resolve consistent target project ownership and move candidate queries into the model layer; restrict execution, spec and nested issue associations to that project, exclude self, and preserve the 100-candidate/type limit with deterministic ordering.
- [ ] 2.2 Keep legacy scoring, length gate and first-match behavior for eligible data; replace the missing-project-filter TODO with passing regression tests, including corrupt cross-project associations and invalid target ownership.

## 3. Jev evaluation

- [ ] 3.1 Extract the evaluated question and normalization into a typed shared module; use it in the production adapter and live comparison, pinning initial production model `jev-1.13.0` and threshold 0.8.
- [ ] 3.2 Implement the reused server-only client, four-request concurrency limit, 10-second request timeout, no retries, 30-second review deadline and cancellation. Validate response probabilities and abort the review on any provider failure.
- [ ] 3.3 Select the highest qualifying candidate with deterministic ties; prefer confirmed same-project source assumptions, otherwise highest score with ID tie-break. Bypass legacy length/string filters in enabled mode.
- [ ] 3.4 Test ranking, 0.8 boundary, no match, no candidates, long messages, source-assumption selection and malformed probabilities with a mocked provider.
- [ ] 3.5 Test timeouts, cancellation, concurrency bounds, authorization/rate-limit errors and failure after a partial successful score; assert no fallback or persistence on failure.

## 4. Integration and persistence

- [ ] 4.1 Route single and bulk review through the configured mode while preserving existing response shapes and per-item bulk failure handling.
- [ ] 4.2 Skip Jev for existing target assumptions; after scoring, lock and recheck the target and selected relationship in a transaction before creating an unconfirmed bot suggestion with probability as score.
- [ ] 4.3 Cover concurrent user assignment, duplicate review, disappearing/invalid source association, and both providers through service entry points.
- [ ] 4.4 Add sanitized provider/outcome, model/question version, candidate count, latency and token-usage logging without credentials or diagnostic payloads.

## 5. Documentation and verification

- [ ] 5.1 Update `.env.example` and deployment documentation with the capability-level flag, provider-specific secret, startup validation, data transfer, request budgets and rollback procedure.
- [ ] 5.2 Run the shared synthetic comparison using the extracted production question and inspect false positives/negatives; preserve the distinction between labeled quality results and successful API calls.
- [ ] 5.3 Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`; review MVC boundaries and project isolation, and confirm existing REST/MCP schemas require no shape changes.
