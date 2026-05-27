## Why

AI analysis traces for failed test results carry high prompt token usage, with one observed failed-result analysis around 15k tokens. Before changing providers, production prompts, or compressing error messages and stack traces, we need a repeatable way to evaluate whether TONL payload encoding can reduce token usage while preserving analysis quality.

## What Changes

- Add a test-only evaluation path that runs the stored-results-analysis prompt with the current raw JSON payload format and one or more TONL payload variants.
- Use realistic failed-result fixtures from the upload/analysis flow so comparisons reflect real error messages, stack traces, locations, retries, and execution metadata.
- Ensure each variant is traced clearly in LangSmith with metadata identifying encoder format, fixture set, prompt version, and model.
- Compare quality outcomes for each payload format, including category correctness, status preservation, confidence expectations, conclusion usefulness, and error-quality behavior.
- Compare token usage and cost from LangSmith traces, with local test output summarizing JSON vs TONL deltas for quick review.
- Keep the work test-only and explicitly out of production analysis integration.

## Capabilities

### New Capabilities

- `analysis-payload-encoding-evaluation`: Test-only evaluation of stored-results-analysis payload encodings, including raw JSON and TONL variants, with quality and token/cost comparison.

### Modified Capabilities

- None.

## Impact

- Affects prompt evaluation tests under `__prompts-tests__/stored-results-analysis`.
- May add test fixtures derived from realistic failed-result payloads.
- May add test-only helpers for TONL serialization, token counting, and LangSmith run metadata.
- May add npm scripts for running the comparison suite.
- Does not change REST APIs, MCP tools, database schema, production prompt behavior, provider/model selection, or production payload encoding.
