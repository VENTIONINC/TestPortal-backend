# Server AI configuration

The backend requires a versioned JSON file for server-wide OpenAI model settings. It loads the shipped `config/ai/server.json` by default, or a complete replacement selected by `AI_CONFIG_PATH`. It loads the file once during startup, after dotenv has loaded and before the HTTP listener starts. Editing the file requires a process restart.

Set `AI_CONFIG_PATH` to an absolute path or a path relative to the process working directory to replace the shipped file. The production image includes the required shipped file under `/app/config/ai`. Mount a complete configuration into the task/container at the desired path, then set `AI_CONFIG_PATH` to that mounted path. ECS deployments should provide the file through their normal task volume or config injection mechanism. `OPENAI_API_KEY` remains an environment secret and must never be placed in JSON.

The server requires `OPENAI_API_KEY` for both the shipped file and custom files, and fails startup when it is missing. A selected file is never merged with another file and there are no hardcoded generation defaults. Invalid or missing files, unsupported fields, models, reasoning combinations, limits, required settings, or profile references fail startup. Errors do not include file contents or secret values.

## Profiles and operations

Profiles select a provider and model. Operations reference profiles and require `maxOutputTokens` and `maxRetries`; they may set temperature and SDK request timeout. `config/ai/server.json` owns the shipped baseline. For custom configuration, copy `config/ai/server.json`, adjust the settings, and select the copy with `AI_CONFIG_PATH`. The editor schema is `config/ai/server.schema.json`.

| Operation | Shipped model | Temperature | Output tokens | Retries |
| --- | --- | ---: | ---: | ---: |
| `storedResultsAnalysis` | `gpt-6-luna` (low reasoning) | omitted | 4000 | 2 |
| `errorFormatting` | `gpt-6-luna` (none reasoning) | omitted | 500 | 2 |
| `solutionSuggestion` | `gpt-4.1-mini` | 0.3 | 700 | 2 |
| `dashboardInsights` | `gpt-4.1-mini` | 0.2 | 400 | 1 |

Supported model identifiers are `gpt-4.1-mini`, `gpt-5.1`, and `gpt-6-luna`. Luna uses the Responses API; LangChain 1.4.5 requires its reasoning option in `modelKwargs`. Luna supports the configured none/low/medium/high efforts and a 128,000-token output ceiling. Explicit temperature is accepted only with reasoning none; omitted Luna reasoning defaults to medium. The current SDK sends `reasoning` settings through its Responses API path. `gpt-5.1` supports `none`, `low`, `medium`, and `high` reasoning effort. Temperature is supported with `gpt-5.1` only when the effective reasoning effort is `none`; inherited temperature is omitted for other reasoning efforts, while an explicit temperature is rejected. The `gpt-5.1` output ceiling is 128,000 tokens. Reasoning tokens count toward the output budget, so allocate enough budget for both internal reasoning and the visible response.

The dashboard's eight-second overall fallback deadline remains separate from an optional SDK request timeout. The timeout does not replace or extend the existing fallback behavior.

## Prompt evaluations

Evaluations use an independent configuration selected with `AI_EVAL_CONFIG_PATH`. Without it, they load the checked-in `config/ai/evaluation.baseline.json` relative to the application root. Production settings are never read by evaluation runners. The baseline uses Luna low for classification (4000 output tokens), Luna none for error formatting (500), and GPT-4.1 mini for solution suggestions (temperature 0.3, 700). All use two retries and disabled cache. The shipped evaluation baseline matches production model and generation settings for the three evaluated operations. The files remain separate so experiments can use `AI_EVAL_CONFIG_PATH` without changing production. Runner model/temperature overrides take precedence over the evaluation file and are validated before provider invocation. Evaluation reports identify `evaluation-baseline` or `custom` as the configuration source.

Live Jest prompt suites load `.env` and skip when `OPENAI_API_KEY` is absent or blank, before reading datasets or calling OpenAI. Placeholder credentials are confined to mocked unit-test setup. Direct runner calls still reject missing credentials.
