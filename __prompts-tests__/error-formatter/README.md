# Error formatter baseline

Run the current production formatter against six fixed synthetic cases:

```bash
npx jest --config jest.prompts.config.ts --selectProjects error-formatter --runInBand
```

Requires `OPENAI_API_KEY` in the environment or `.env` and makes six paid API calls (plus any provider retries). The production formatter uses GPT-6 Luna through the Responses API, reasoning `none`, no explicit temperature, and a 500-token limit. No database is used. No dataset generation is needed.

To compare the previous model using the same production method, prompts, cases and checks:

```bash
ERROR_FORMATTER_MODEL=gpt-4.1-mini npx jest --config jest.prompts.config.ts --selectProjects error-formatter --runInBand
```

The test-only constructor wrapper selects GPT-4.1 Mini through Chat Completions with temperature 0.7 for this comparison. The 500-token limit is unchanged. Reports record the selected settings. Production GPT-6 reasoning is passed through `modelKwargs` because LangChain 1.4.5 does not recognize GPT-6 reasoning models.

Set `ERROR_FORMATTER_MODEL=gpt-6-luna ERROR_FORMATTER_REASONING=low` to evaluate low reasoning with the same 500-token limit. Supported efforts are `none` (production default) and `low`.

Reports also capture actual LangChain/OpenAI `usage_metadata` through an observation-only callback, both per case (`usage`) and per run (`usageEntries`). Input tokens include cached input; output tokens include reasoning tokens. Do not add either subset again when calculating totals. Missing usage fails a test instead of being treated as zero. These are reported completed-call usage figures, not an account invoice.

Checks preserve HTTP status codes, selectors, timeout values, DNS details, exception locations, assertion values and explicit uncertainty, plus the structured output contract. Equivalent representations of time and source coordinates are accepted.

Timestamped JSON reports in the ignored `reports/` directory contain inputs, outputs and latency. Review them for invented facts, reversed expected/actual values, readability and usefulness: regex checks alone do not establish semantic quality. Repeat the baseline before comparing models because responses are stochastic. Report metadata must be updated if production model settings change.
