# Proposal

## Why

AI services hardcode OpenAI clients and model choices despite having different generation settings. Issue [#118](https://github.com/VENTIONINC/TestPortal-backend/issues/118) introduces server-controlled, per-operation configuration before adding Anthropic in [#42](https://github.com/VENTIONINC/TestPortal-backend/issues/42).

## What Changes

- Add required, shipped versioned JSON configuration, optionally replaced by a custom file selected through `AI_CONFIG_PATH`, with named provider/model/reasoning profiles and mappings for the four current AI operations.
- Keep credentials in environment variables and load configuration once before the server accepts requests.
- Extract a small configuration loader and operation-settings resolver. Existing services keep their direct `ChatOpenAI` calls, prompts, structured-output handling, and failure behavior.
- Validate configuration structure, references, model capabilities, and explicitly configured parameters; publish a matching JSON Schema for editor support.
- Load the shipped configuration when no nonempty custom path is supplied. Custom files replace it entirely; neither source falls back to hardcoded settings. Missing or invalid files and missing credentials fail startup.
- Give prompt evaluations separate versioned configuration, shared configuration validation, and effective configuration metadata without inheriting production settings.
- Preserve the merged #106/#107 model choices in shipped production and independent evaluation profiles: GPT-6 Luna low for classification and Luna none for error formatting. Solution suggestions and insights remain GPT-4.1 mini.
- Skip live Jest prompt suites when OpenAI credentials are absent; keep placeholder credentials confined to mocked unit tests and retain credential errors for direct runner calls.
- Document runtime file availability, restart requirements, and configuration usage.

## Capabilities

### New Capabilities

- `server-ai-configuration`: Validated, server-wide model profiles, operation settings, shipped baseline settings, and OpenAI operation settings.
- `ai-evaluation-configuration`: Independent evaluation profiles, file-owned evaluation baseline settings, and effective configuration metadata.

### Modified Capabilities

None. Existing specifications do not describe AI provider configuration.

## Impact

- Affects startup/configuration, `testAnalysisService`, `errorFormatterService`, `insightsService`, the classification, error-formatter, and solution evaluation suites, and their tests.
- Adds shipped configuration files, JSON Schema, and environment/deployment documentation; ensures the required shipped configuration is available and selected automatically in the production image.
- Keeps the installed `@langchain/openai` integration and introduces no provider framework; no database migration or REST/MCP contract change is intended.
- Anthropic, Azure OpenAI, AWS Bedrock, OpenRouter, user/project settings, hot reload, and new AI features remain follow-up work.
