# Proposal

## Why

TP-5 needs comparable evidence for decision-based test-result classification across Jev and OpenAI. A shared OpenRouter adapter lets the same evidence and category policy reach each model without adding provider-specific integrations or changing production analysis.

## What Changes

- Add a typed, runtime-validated adapter for OpenRouter's `POST /api/alpha/decisions`, supporting `noul`, `choice`, and `score`, explicit provider failures and invalid-response outcomes, configurable timeout/retry, and `OPENROUTER_API_KEY`.
- Add explicit evaluation profiles for `typesafe/jev-1.13` and `openai/gpt-6-luna-decisions`, with automatic fallback disabled. Microsoft model support and evaluation are excluded from TP-5.
- Add an independently selected `stored-results-analysis-openrouter-decisions` Jest project and shared category-only evaluation runner. Reuse the existing v1.1.0 smoke/regression datasets, input evidence, category meanings, precedence, and acceptance thresholds.
- Produce ignored timestamped and latest reports per profile/suite, preserving raw probabilities, upstream identity, actual usage/cost, dataset identity, and policy version. Compare only runs using identical datasets and policies.
- Add deterministic mocked coverage and document opt-in live access, commands, report interpretation, and evidence limitations.
- Apply the user's confirmed scope change: OpenRouter replaces the original ticket's direct OpenAI adapter, OpenAI-specific credentials/project, and direct predicate wire contract. Existing direct Jev and generative OpenAI evaluations remain available independently.

## Capabilities

### New Capabilities

- `openrouter-decisions-adapter`: Typed OpenRouter decision requests, validated answers, model configuration, credentials, and failure semantics.
- `openrouter-classification-evaluation`: Profile-driven, isolated stored-result classification and reproducible cross-model reporting.

### Modified Capabilities

None. `jev-classification-evaluation` continues to define the existing direct TypeSafe evaluation; the added OpenRouter route does not replace it.

## Impact

- New integration utility under `src/lib/openrouter-decisions/`; new runners, profiles, suites, and deterministic tests under the existing prompt-evaluation directories.
- Focused updates to `jest.prompts.config.ts`, prompt-evaluation documentation, environment examples, and report helpers only as needed for compatible reuse.
- Use native Node fetch and existing Zod; no OpenAI SDK upgrade or new runtime dependency is planned.
- No production enablement, Prisma changes, REST/MCP changes, feedback changes, confidence calibration, explanatory pipeline, or tracker requirement edits.
- Existing datasets contain four smoke and forty regression cases but no performance-category template. Preserve them for baseline comparability; record this coverage limitation and cover performance/precedence request policy with mocked fixtures. A larger live diagnostic dataset is deferred.
