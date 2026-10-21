# Proposal

## Why

TP-1 and TP-5 provide category-classification research infrastructure, but the OpenRouter experiment currently compares only Jev and OpenAI Decisions. Add Microsoft-Decision-1 to compare all three on identical evidence and help choose a model for future work.

## What Changes

- Extend TP-5's typed OpenRouter Decisions integration with a pinned `microsoft` evaluation profile using `microsoft/microsoft-decision-1`; reject unsupported model overrides explicitly.
- Add isolated Microsoft smoke/regression suites in `stored-results-analysis-microsoft-decision`, reusing the existing runner, result-only evidence, category policy, and datasets.
- Extend local comparison tooling to compare Jev, OpenAI Decisions, and Microsoft through OpenRouter exclusively, validating common dataset/policy identity and preserving the existing two-report comparison.
- Keep only validated decision answers and comparison metadata in ignored profile/suite reports: predictions, raw confidence/probabilities, accuracy, latency, actual usage/cost, model identity, and evaluation date. Do not capture complete provider responses.
- Cover Microsoft request construction, isolation, input-limit failures, invalid responses, and three-model comparison with deterministic tests. Document commands and distinguish mocked evidence from live evaluation results.

## Capabilities

### New Capabilities

None; extend the existing OpenRouter capabilities.

### Modified Capabilities

- `openrouter-decisions-adapter`: Permit the Microsoft evaluation profile alongside Jev/OpenAI, preserve explicit credentials/model selection, and specify input-limit failure behavior.
- `openrouter-classification-evaluation`: Add isolated Microsoft evaluation, validated-answer-only reporting, and compatible two/three-profile OpenRouter comparisons.

## Impact

- Base branch: `feature/tp-5`, which includes `feature/tp-1`; tracked ticket: TP-4.
- Affected areas: `__prompts-tests__/stored-results-analysis/runners/openrouter-*`, comparison tooling, a Microsoft test environment and smoke/regression files, `jest.prompts.config.ts`, focused tests, and prompt-testing documentation. The shared adapter needs only targeted changes where failure handling requires them.
- Reuse the existing typed HTTP adapter; no SDK upgrade or new dependency is planned.
- Preserve production classification, Prisma/database schema, REST/MCP contracts, review/feedback, direct-provider projects, existing OpenRouter Jev/OpenAI selection, and confidence semantics.
- Research only: no production enablement, automatic winner selection, confidence calibration, full response capture, or dataset expansion. User clarification supersedes ticket wording about raw output and direct Jev comparison; tracker content remains unchanged.
