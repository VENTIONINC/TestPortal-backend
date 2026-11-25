## Why

The current string-based error matcher misses paraphrased failures and links unrelated failures with similar text. An initial synthetic comparison gave Jev 31/34 correct labeled decisions versus 15/34 for the legacy matcher, warranting an opt-in production path while preserving the existing default.

## What Changes

- Add server environment flag `ERROR_SIMILARITY_AI_ENABLED`, defaulting to false. Enabled reviews use Jev instead of the legacy similarity calculation.
- Require a non-empty server-side `TYPESAFE_API_KEY` when enabled; reject invalid configuration at startup.
- Use the evaluated Jev pair judgment with model `jev-1.13.0` and initial threshold 0.8; select the highest-scoring eligible candidate and keep suggestions unconfirmed.
- Scope candidate retrieval and issue linking to the target project in both modes, correcting the acknowledged missing project filter.
- Keep the legacy matching behavior when disabled, except for project isolation. Do not silently fall back to legacy matching after a Jev failure.
- Document deployment, rollback, bounded external requests, and operational failures; extend deterministic tests and the shared live comparison.

## Capabilities

### New Capabilities

- `configurable-error-similarity`: Server-selected legacy/Jev matching, conditional credentials, project-scoped suggestions, and failure behavior for single and bulk reviews.

### Modified Capabilities

None.

## Impact

- Configuration/bootstrap, `src/lib/error-analyzer.ts`, result-error service/model boundaries, and a dedicated TypeSafe similarity adapter.
- Existing `@typesafe-ai/sdk` dependency, `.env.example`, deployment documentation, unit tests, and `__prompts-tests__/error-similarity`.
- No database migration or new REST/MCP response fields. Existing review entry points share the selected implementation. Deployment must supply the TypeSafe secret before enabling the flag.
- Error text and normalized traces are sent to TypeSafe only in enabled mode. The experiment is synthetic evidence, not a production accuracy guarantee.
