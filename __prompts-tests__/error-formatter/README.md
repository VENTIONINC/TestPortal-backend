# Error formatter baseline

Run the current production formatter against six fixed synthetic cases:

```bash
npx jest --config jest.prompts.config.ts --selectProjects error-formatter --runInBand
```

Requires `OPENAI_API_KEY` in the environment or `.env` and makes six paid API calls (plus any provider retries). Without credentials the suite skips. No database is used and no dataset generation is needed.

The suite uses the production formatter method and prompt with settings resolved from the independent `config/ai/evaluation.baseline.json` file. Its `errorFormatting` profile selects GPT-6 Luna through the Responses API, reasoning `none`, no explicit temperature, and a 500-token limit.

For model or reasoning comparisons, copy the evaluation JSON, adjust the formatter profile and operation settings, then select the complete file with `AI_EVAL_CONFIG_PATH`. Production `AI_CONFIG_PATH` does not affect evaluations. There are no model-specific environment overrides. The shared resolver passes GPT-6 reasoning through `modelKwargs` because LangChain 1.4.5 does not recognize GPT-6 reasoning models.

Reports also capture actual LangChain/OpenAI `usage_metadata` through an observation-only callback, both per case (`usage`) and per run (`usageEntries`). Input tokens include cached input; output tokens include reasoning tokens. Do not add either subset again when calculating totals. Missing usage fails a test instead of being treated as zero. These are reported completed-call usage figures, not an account invoice.

Checks preserve HTTP status codes, selectors, timeout values, DNS details, exception locations, assertion values and explicit uncertainty, plus the structured output contract. Equivalent representations of time and source coordinates are accepted.

Timestamped JSON reports in the ignored `reports/` directory contain inputs, outputs and latency. Review them for invented facts, reversed expected/actual values, readability and usefulness: regex checks alone do not establish semantic quality. Repeat the baseline before comparing models because responses are stochastic. Reports identify the independent evaluation settings, profile, operation, provider, prompt version, and configuration source. Reports also include aggregate usage and a latest.json copy.
