# Design

## Context

See proposal.md and issue #118 for motivation. Four operations construct `ChatOpenAI` directly: stored-results analysis, error formatting, solution suggestions, and dashboard insights. Each already owns its prompts, output handling, generation settings, and errors. Dashboard insights has an eight-second fallback deadline.

The two evaluation runners also construct `ChatOpenAI`. Their defaults differ from production: analysis evaluations use temperature 0.1 rather than 0, and suggestion evaluations allow 600 output tokens rather than 700.

## Goals / Non-Goals

**Goals:** Make model and generation settings configurable per operation, validate configuration, preserve defaults, and keep evaluations independent from production.

**Non-Goals:** A provider interface, shared invocation wrapper, client registry, dependency-injection framework, response normalization layer, new timeout/cancellation machinery, model discovery, or additional providers. Existing prompts, output parsing, retries, error handling, and public contracts stay in their current services.

## Decisions

### 1. JSON profiles and operation mappings

Production uses `AI_CONFIG_PATH`; evaluations use `AI_EVAL_CONFIG_PATH`. Relative paths resolve against the process working directory. Blank paths select defaults. Explicit unreadable or invalid files fail clearly instead of falling back. Read once during initialization; changes require a restart. Credentials remain in `OPENAI_API_KEY`, never JSON.

Version 1 uses strict Zod validation with named profiles containing `provider: "openai"`, `model`, and optional `reasoning: { effort }`. Operation mappings contain `profile`, optional `temperature`, `maxOutputTokens`, `maxRetries`, and SDK `timeoutMs`. Production requires all four mappings; evaluation configuration requires the two existing suites. Reject unknown fields, unresolved profile references, and invalid numeric values. Supply an editor JSON Schema and credential-free examples; a focused parity test is sufficient, without a new schema-generation CLI/build pipeline.

```json
{
  "version": 1,
  "profiles": {
    "fast": { "provider": "openai", "model": "gpt-4.1-mini" }
  },
  "operations": {
    "storedResultsAnalysis": { "profile": "fast", "maxOutputTokens": 4000 },
    "errorFormatting": { "profile": "fast", "maxOutputTokens": 500 },
    "solutionSuggestion": { "profile": "fast", "maxOutputTokens": 700 },
    "dashboardInsights": { "profile": "fast", "maxOutputTokens": 400 }
  }
}
```

This captures repeated model choices without environment variables for every operation. Keep SDK request timeouts distinct from the existing overall dashboard fallback deadline; this migration does not replace or make that deadline configurable.

### 2. Small loader and settings resolver

Keep the schema, loader, defaults, and operation resolver in a small configuration module under `src/config`. Return plain settings suitable for each existing `new ChatOpenAI(...)` call, translating `maxOutputTokens` to `maxTokens` and `timeoutMs` to the SDK timeout option. Services continue invoking clients and calling `withStructuredOutput` directly. No module accepts prompt messages or performs provider requests on behalf of services.

Initialize production configuration after dotenv has loaded and before `app.listen`; avoid import-time file/env reads. A simple explicit initialization call suffices, without extracting a server bootstrap framework. Evaluation initialization uses its own path and does not initialize production configuration.

An explicit production file requires `OPENAI_API_KEY` at startup. Without a file, preserve startup without a key; existing invocation failures/fallbacks apply when AI is attempted. Configuration errors name fields and credential requirements without printing values or file contents. Validation checks presence, not remote key validity.

### 3. Defaults and applicable model checks

| Operation | Temperature | maxOutputTokens | maxRetries |
| --- | --- | --- | --- |
| storedResultsAnalysis | 0 | 4000 | 2 |
| errorFormatting | 0.7 | 500 | 2 |
| solutionSuggestion | 0.3 | 700 | 2 |
| dashboardInsights | 0.2 | 400 | 1 |

Default model is `gpt-4.1-mini`, with no reasoning override and no new SDK timeout. Preserve the dashboard's existing eight-second overall deadline and fallback text.

Use a small OpenAI-specific supported-model table inside configuration validation for initially verified `gpt-4.1-mini` and `gpt-5.1` identifiers. It only describes settings needed by this change: effort values, temperature compatibility, applicable generation limits, and whether the existing SDK needs a Responses option. It is not a provider registry or structured-output strategy framework. Verify supported identifiers/options against current official docs and the installed SDK during implementation; reject unknown models rather than guess their capabilities.

Explicit unsupported settings fail validation. Omit an inherited temperature where the model/effort combination prohibits it; reject explicit temperature in that case. Reasoning token ceilings include reasoning and visible output, so examples/docs explain budget allocation without new response/fallback policies. A supported model means configuration/SDK compatibility, not evaluated quality.

### 4. Independent evaluations

Use a checked-in evaluation baseline selected independently of production. Preserve model `gpt-4.1-mini`, temperatures 0.1/0.3, output limits 4000/600, retries 2, no reasoning override, and cache disabled.

Keep runner model/temperature overrides with precedence: runner override, evaluation file, suite defaults. Revalidate the resulting settings. Runners still construct `ChatOpenAI`, invoke it, and validate suite expectations directly; only settings resolution is shared.

Add metadata for operation/suite, prompt version, config version/source, profile, model, provider, reasoning, and effective generation settings. Report it alongside successes and assertion failures. Do not add raw-response capture solely to obtain a resolved model snapshot; record the requested model accurately and provider-reported identity only if already available. Exclude credentials and reasoning traces.

### 5. Documentation and runtime files

Provide credential-free examples and editor schemas under `config/ai`, with the minimal Docker copy needed for documented example paths. Document mounted/ECS config-file provisioning, environment variables, supported settings, evaluation isolation, and restarts. Do not introduce a new dependency or tooling pipeline solely for packaging examples.

## Risks / Trade-offs

- Model settings change → Keep a small verified OpenAI settings table and test invalid combinations; extend it when needed.
- Reasoning budgets can exhaust output limits → Document their total-token meaning and appropriate examples; preserve current service handling.
- Production and evaluation defaults differ → Keep independent configuration sources and test exact baseline values.
- Configuration is read before dotenv → Initialize explicitly after env loading and test startup ordering.
- Editor schema drifts → Add a focused parity/example check against runtime validation.

## Migration Plan

1. Add config validation/loading/resolution and defaults with focused tests.
2. Replace constructor literals in the four operations and two evaluation runners with resolved settings, keeping existing invocation code.
3. Document examples, environment selection, and runtime-file provisioning.
4. Deploy without a config path to retain existing behavior, then opt into a legacy-equivalent file and restart.

Rollback by removing `AI_CONFIG_PATH` and restarting. No database migration is involved. All implementation tasks are pending because the previous implementation has been discarded.
