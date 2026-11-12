# Error formatter baseline

Run the current production formatter against six fixed synthetic cases:

```bash
npx jest --config jest.prompts.config.ts --selectProjects error-formatter --runInBand
```

Requires `OPENAI_API_KEY` in the environment or `.env` and makes six paid API calls. Baseline settings resolve from the selected immutable runtime configuration (`AI_CONFIG_PATH`, or the packaged generic configuration when unset). No database is used. No dataset generation is needed.

For an isolated comparison, set explicit supported operation overrides:

```bash
ERROR_FORMATTER_MODEL=gpt-4.1-mini ERROR_FORMATTER_API=chat-completions ERROR_FORMATTER_TEMPERATURE=0.7 npx jest --config jest.prompts.config.ts --selectProjects error-formatter --runInBand
```

Other supported overrides are `ERROR_FORMATTER_REASONING` and `ERROR_FORMATTER_MAX_OUTPUT_TOKENS`. Model aliases are validated as nonempty settings, with no hard-coded allowlist. Invalid combinations fail before a request; temperature and reasoning cannot both be set. Retry policy is fixed and cannot be overridden. The evaluation uses the shared operation client and leaves the selected baseline snapshot unchanged.

For example, set `ERROR_FORMATTER_MODEL=gpt-6-luna ERROR_FORMATTER_REASONING=low` to compare a reasoning setting while retaining the selected output limit.

Reports also capture actual LangChain/OpenAI `usage_metadata` through an observation-only callback, both per case (`usage`) and per run (`usageEntries`). Input tokens include cached input; output tokens include reasoning tokens. Do not add either subset again when calculating totals. Missing usage fails a test instead of being treated as zero. These are reported completed-call usage figures, not an account invoice.

Checks preserve HTTP status codes, selectors, timeout values, DNS details, exception locations, assertion values and explicit uncertainty, plus the structured output contract. Equivalent representations of time and source coordinates are accepted.

Timestamped JSON reports in the ignored `reports/` directory contain synthetic inputs, outputs, per-case latency and usage, and are labeled baseline or comparison. They record effective settings, explicit overrides, a safe connection label, and returned model identity when available. Review outputs for invented facts, reversed expected/actual values, readability and usefulness: regex checks alone do not establish semantic quality. Repeat affected checks separately because responses are stochastic. Reports also include aggregate usage and a `latest.json` copy. Existing historical reports retain their original settings; do not rewrite them to represent a new profile. Keep private profiles and semantic evidence out of public artifacts.
