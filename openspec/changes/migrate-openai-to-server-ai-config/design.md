# Design

## Context

See proposal.md and issue #118 for motivation. Four operations construct `ChatOpenAI` directly: stored-results analysis, error formatting, solution suggestions, and dashboard insights. Each already owns its prompts, output handling, generation settings, and errors. Dashboard insights has an eight-second fallback deadline.

The two evaluation runners also construct `ChatOpenAI`. Their defaults differ from production: analysis evaluations use temperature 0.1 rather than 0, and suggestion evaluations allow 600 output tokens rather than 700.

## Goals / Non-Goals

**Goals:** Make model and generation settings configurable per operation, validate configuration, keep baseline settings in shipped files, and keep evaluations independent from production.

**Non-Goals:** A provider interface, shared invocation wrapper, client registry, dependency-injection framework, response normalization layer, new timeout/cancellation machinery, model discovery, or additional providers. Existing prompts, output parsing, retries, error handling, and public contracts stay in their current services.

## Decisions

### 1. JSON profiles and operation mappings

Production uses `AI_CONFIG_PATH`; evaluations use `AI_EVAL_CONFIG_PATH`. Relative paths resolve against the process working directory. Unset or blank production paths select the shipped `config/ai/server.json`; unset or blank evaluation paths select `config/ai/evaluation.baseline.json`. A nonempty path selects a custom file that replaces the corresponding shipped file entirely, without merging. Missing, unreadable, or invalid files from either source fail clearly instead of falling back to another file or hardcoded settings. Custom relative paths resolve against the process working directory; bundled paths resolve against the application root so selection works independently of the launch directory in development and built runtime. Read once during initialization; changes require a restart. Credentials remain in `OPENAI_API_KEY`, never JSON.

Version 1 uses strict Zod validation with named profiles containing `provider: "openai"`, `model`, and optional `reasoning: { effort }`. Operation mappings contain `profile`, required `maxOutputTokens` and `maxRetries`, plus optional `temperature` and SDK `timeoutMs`. Production requires all four mappings; evaluation configuration requires the two existing suites. Reject unknown fields, unresolved profile references, and invalid numeric values. Supply an editor JSON Schema and credential-free examples; a focused parity test is sufficient, without a new schema-generation CLI/build pipeline.

```json
{
  "version": 1,
  "profiles": {
    "fast": { "provider": "openai", "model": "gpt-4.1-mini" }
  },
  "operations": {
    "storedResultsAnalysis": { "profile": "fast", "temperature": 0, "maxOutputTokens": 4000, "maxRetries": 2 },
    "errorFormatting": { "profile": "fast", "temperature": 0.7, "maxOutputTokens": 500, "maxRetries": 2 },
    "solutionSuggestion": { "profile": "fast", "temperature": 0.3, "maxOutputTokens": 700, "maxRetries": 2 },
    "dashboardInsights": { "profile": "fast", "temperature": 0.2, "maxOutputTokens": 400, "maxRetries": 1 }
  }
}
```

This captures repeated model choices without environment variables for every operation. Keep SDK request timeouts distinct from the existing overall dashboard fallback deadline; this migration does not replace or make that deadline configurable.

### 2. Small loader and settings resolver

Keep the schema, loader, and operation resolver in a small configuration module under `src/config`. Return plain settings suitable for each existing `new ChatOpenAI(...)` call, translating `maxOutputTokens` to `maxTokens` and `timeoutMs` to the SDK timeout option. Services continue invoking clients and calling `withStructuredOutput` directly. No module accepts prompt messages or performs provider requests on behalf of services.

Initialize production configuration after dotenv has loaded and before `app.listen`; avoid import-time file/env reads. A simple explicit initialization call suffices, without extracting a server bootstrap framework. Evaluation initialization uses its own path and does not initialize production configuration.

Both shipped and custom production configurations require `OPENAI_API_KEY` at startup. Validate the selected file and credentials before accepting requests; deployments without the key fail startup. Configuration errors name fields and credential requirements without printing values or file contents. Validation checks presence, not remote key validity.

### 3. File-owned baseline settings and applicable model checks

| Operation | Temperature | maxOutputTokens | maxRetries |
| --- | --- | --- | --- |
| storedResultsAnalysis | 0 | 4000 | 2 |
| errorFormatting | 0.7 | 500 | 2 |
| solutionSuggestion | 0.3 | 700 | 2 |
| dashboardInsights | 0.2 | 400 | 1 |

The shipped production file contains the table above and selects `gpt-4.1-mini`, with no reasoning override and no new SDK timeout. These values are not duplicated as resolver defaults in code. Missing required operation fields fail validation. Omitted temperature, reasoning, or timeout remains absent from constructor options; provider/SDK behavior applies for omitted optional parameters. Preserve the dashboard's existing eight-second overall deadline and fallback text.

Use a small OpenAI-specific supported-model table inside configuration validation for initially verified `gpt-4.1-mini` and `gpt-5.1` identifiers. It only describes settings needed by this change: effort values, temperature compatibility, applicable generation limits, and whether the existing SDK needs a Responses option. It is not a provider registry or structured-output strategy framework. Verify supported identifiers/options against current official docs and the installed SDK during implementation; reject unknown models rather than guess their capabilities.

Explicit unsupported settings fail validation. An omitted temperature remains absent for every model; reject an explicit temperature when the model/effort combination prohibits it. Reasoning token ceilings include reasoning and visible output, so examples/docs explain budget allocation without new response/fallback policies. A supported model means configuration/SDK compatibility, not evaluated quality.

### 4. Independent evaluations

Use a checked-in evaluation baseline selected independently of production. The evaluation baseline file owns model `gpt-4.1-mini`, temperatures 0.1/0.3, output limits 4000/600, retries 2, and no reasoning override. Keep cache disabled as evaluation-runner behavior, not as a generation-settings fallback.

Keep runner model/temperature overrides with precedence: runner override, selected evaluation file. There is no suite-default settings layer. Revalidate the resulting settings. Runners still construct `ChatOpenAI`, invoke it, and validate suite expectations directly; only settings resolution is shared.

Identify configuration source as shipped production file, evaluation baseline file, or custom file; remove the legacy-defaults source. Add metadata for operation/suite, prompt version, config version/source, profile, model, provider, reasoning, and effective generation settings. Report it alongside successes and assertion failures. Do not add raw-response capture solely to obtain a resolved model snapshot; record the requested model accurately and provider-reported identity only if already available. Exclude credentials and reasoning traces.

### 5. Documentation and runtime files

Ship the required credential-free production configuration at `config/ai/server.json`, the independent evaluation baseline, and editor schemas under `config/ai`. Keep examples valid under the same schema. Copy these files into the production image and verify automatic bundled selection without environment path overrides. Document mounted/ECS config-file provisioning, environment variables, supported settings, evaluation isolation, and restarts. Do not introduce a new dependency or tooling pipeline solely for packaging examples.

## Risks / Trade-offs

- Model settings change → Keep a small verified OpenAI settings table and test invalid combinations; extend it when needed.
- Reasoning budgets can exhaust output limits → Document their total-token meaning and appropriate examples; preserve current service handling.
- Production and evaluation baselines differ → Keep independent shipped files and test exact file-owned settings.
- Configuration is read before dotenv → Initialize explicitly after env loading and test startup ordering.
- Editor schema drifts → Add a focused parity/example check against runtime validation.

## Migration Plan

1. Add required shipped-file selection and remove hardcoded generation-settings defaults; test file selection, required fields, and initialization failures.
2. Replace constructor literals in the four operations and two evaluation runners with resolved settings, keeping existing invocation code.
3. Document examples, environment selection, and runtime-file provisioning.
4. Deploy with the shipped production file and required credentials; no config path override is needed. Select a complete custom file only when needed, then restart.

Removing `AI_CONFIG_PATH` and restarting restores the shipped production file, while retaining credential requirements. To restore previous shipped settings, redeploy the previous version or select a valid complete configuration with those settings. No database migration is involved. The earlier implementation exists; the file-owned configuration delta is tracked by pending tasks.
