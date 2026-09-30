# Tasks

## 1. Configuration extraction

- [x] 1.1 Add a small configuration module with versioned Zod schema, JSON loader, operation mappings, and legacy defaults; verify malformed files, unknown fields, invalid values/references, path resolution, and all four exact defaults with focused Jest tests.
- [x] 1.2 Add minimal OpenAI model-setting validation and constructor-option resolution; verify supported reasoning, incompatible explicit settings, inherited temperature omission, token limits, and SDK option names against mocked constructors and official documentation.
- [x] 1.3 Add explicit initialization after dotenv and before listen, with credential validation for explicit configuration; verify legacy startup without a key and actionable explicit-file errors without new server abstractions.
- [x] 1.4 Add JSON examples/editor schema and document profiles, per-operation settings, defaults, credentials, reasoning budgets, and restart behavior; verify examples and schema agree with runtime validation.

## 2. Existing service integration

- [x] 2.1 Replace hardcoded constructor settings in stored-results analysis and error formatting with resolved settings; verify existing service tests preserve prompts, structured-output handling, result mapping, and errors while selecting configured models.
- [x] 2.2 Replace constructor settings in solution suggestions and dashboard insights; verify separate preliminary-analysis settings, existing fallback text, and the existing eight-second timeout behavior.
- [x] 2.3 Document all four operation mappings and verify a focused mocked test shows different models/settings per operation without a provider interface or invocation wrapper.

## 3. Evaluation configuration

- [x] 3.1 Add an independent evaluation baseline and path selection using the same config vocabulary; verify production path changes do not affect evaluation settings and preserve both suites' exact defaults.
- [x] 3.2 Update runner constructor settings while preserving direct invocation and validated model/temperature overrides; verify precedence and existing evaluation assertions with mocked calls.
- [x] 3.3 Add effective configuration metadata to evaluation results/reporting and update the prompt-test README; verify success/assertion-failure reports identify the configuration without credentials or reasoning traces.

## 4. Deployment and verification

- [x] 4.1 Update environment/deployment documentation and minimally package credential-free examples in Docker; verify documented paths exist in the runtime image and configuration files validate.
- [x] 4.2 Run focused config/service/evaluation tests followed by `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`; verify required checks pass and new supported files carry license headers.
- [x] 4.3 Run `openspec validate migrate-openai-to-server-ai-config --strict`; verify artifacts consistently describe configuration extraction and no implementation task is marked complete after reset.
