# Error formatter baseline

Run the current production formatter against six fixed synthetic cases:

```bash
npx jest --config jest.prompts.config.ts --selectProjects error-formatter --runInBand
```

Requires `OPENAI_API_KEY` in the environment or `.env` and makes six paid API calls (plus any provider retries). The production service currently uses GPT-4.1 mini, temperature 0.7 and a 500-token limit. No database is used. No dataset generation is needed.

To compare Luna using the same production method, prompts, cases and checks:

```bash
ERROR_FORMATTER_MODEL=gpt-5.6-luna npx jest --config jest.prompts.config.ts --selectProjects error-formatter --runInBand
```

The test-only constructor wrapper selects the real Luna client with reasoning `none` and no explicit temperature. The 500-token limit is unchanged. Production code is unaffected; reports record the selected settings.

Add `ERROR_FORMATTER_REASONING=low` to the Luna command to evaluate low reasoning with the same 500-token limit. Supported efforts are `none` (default) and `low`.

Reports also capture actual LangChain/OpenAI `usage_metadata` through an observation-only callback, both per case (`usage`) and per run (`usageEntries`). Input tokens include cached input; output tokens include reasoning tokens. Do not add either subset again when calculating totals. Missing usage fails a test instead of being treated as zero. These are reported completed-call usage figures, not an account invoice.

Checks preserve HTTP status codes, selectors, timeout values, DNS details, exception locations, assertion values and explicit uncertainty, plus the structured output contract. Equivalent representations of time and source coordinates are accepted.

Timestamped JSON reports in the ignored `reports/` directory contain inputs, outputs and latency. Review them for invented facts, reversed expected/actual values, readability and usefulness: regex checks alone do not establish semantic quality. Repeat the baseline before comparing models because responses are stochastic. Report metadata must be updated if production model settings change.
