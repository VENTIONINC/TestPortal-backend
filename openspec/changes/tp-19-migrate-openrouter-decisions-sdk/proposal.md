# Proposal

## Why

The OpenRouter Decisions integration maintains HTTP request construction, authentication, response parsing, timeout handling, and retry logic itself. The published official TypeScript SDK now supports Decisions, allowing TP-19 to replace custom networking while preserving production classification and the independent OpenAI evaluation workflow.

## What Changes

- Pin `@openrouter/sdk` to the verified published version `1.4.25` and use its Decisions operation for all provider requests.
- Keep a small application adapter for strict request validation, correlated answer validation, stable sanitized errors, actual attempt/latency accounting, and nullable metadata.
- Explicitly disable SDK retries and provider fallback; preserve the production 30-second timeout and zero retries, evaluation defaults and supported overrides, and the generic adapter's existing bounded optional retry contract.
- Preserve valid responses without usage, including partial usage, and retain supplied token/cost values that SDK parsing would otherwise drop. Never fabricate missing metrics.
- Remove only transport machinery or schemas demonstrated to be redundant. Update SDK-compatible test injection, production/evaluation callers where necessary, and documentation.
- Verify existing behavior with SDK-backed mocked transport tests, repository checks, and separately recorded live acceptance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is an implementation refactor: `openrouter-decisions-adapter`, `openrouter-classification-evaluation`, and `stored-results-decisions-categorization` remain the behavioral contracts. Missing-usage acceptance is existing behavior confirmed for preservation by the user. This change declares `skip_specs: true`; no delta specs are required.

## Impact

- Dependency manifests: `package.json` and `package-lock.json`.
- Primary integration: `src/lib/openrouter-decisions/{transport,schemas,response}.ts`.
- Consumers: `src/services/testAnalysisService.ts`, existing analysis error sanitization/persistence, and `__prompts-tests__/stored-results-analysis/runners/openrouter-*.ts`.
- Verification: `__tests__/lib/openrouter-decisions.test.ts`, `__tests__/prompts/openrouter-evaluation.test.ts`, existing Decisions service/persistence regression coverage, and the isolated OpenAI smoke/regression suites.
- Documentation: `__prompts-tests__/README.md` and affected integration guidance only.
- No REST/MCP/OpenAPI behavior change, database migration, model or category-policy change, confidence recalibration, additional provider, or automatic production enablement. TP-19 builds from the user-selected `userstory/tp-7` branch.
