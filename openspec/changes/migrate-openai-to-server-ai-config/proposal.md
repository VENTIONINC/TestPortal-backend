# Proposal

## Why

AI services hardcode OpenAI clients and model choices despite having different generation settings. Issue [#118](https://github.com/VENTIONINC/TestPortal-backend/issues/118) introduces server-controlled, per-operation configuration before adding Anthropic in [#42](https://github.com/VENTIONINC/TestPortal-backend/issues/42).

## What Changes

- Add versioned JSON configuration selected by `AI_CONFIG_PATH`, with named provider/model/reasoning profiles and mappings for the four current AI operations.
- Keep credentials in environment variables and load configuration once before the server accepts requests.
- Extract a small configuration loader and operation-settings resolver. Existing services keep their direct `ChatOpenAI` calls, prompts, structured-output handling, and failure behavior.
- Validate configuration structure, references, model capabilities, and explicitly configured parameters; publish a matching JSON Schema for editor support.
- Preserve legacy operation settings when no configuration file is supplied, including deployments without AI credentials. Explicit configuration errors fail startup rather than falling back.
- Give prompt evaluations separate versioned configuration, shared configuration validation, and effective configuration metadata without inheriting production settings.
- Document runtime file availability, restart requirements, and configuration usage.

## Capabilities

### New Capabilities

- `server-ai-configuration`: Validated, server-wide model profiles, operation settings, compatibility defaults, and OpenAI operation settings.
- `ai-evaluation-configuration`: Independent evaluation profiles, legacy evaluation defaults, and effective configuration metadata.

### Modified Capabilities

None. Existing specifications do not describe AI provider configuration.

## Impact

- Affects startup/configuration, `testAnalysisService`, `errorFormatterService`, `insightsService`, the two prompt evaluation runners, and their tests.
- Adds configuration examples, JSON Schema, and environment/deployment documentation; ensures documented sample configuration is available in the production image.
- Keeps the installed `@langchain/openai` integration and introduces no provider framework; no database migration or REST/MCP contract change is intended.
- Anthropic, Azure OpenAI, AWS Bedrock, OpenRouter, user/project settings, hot reload, and new AI features remain follow-up work.
