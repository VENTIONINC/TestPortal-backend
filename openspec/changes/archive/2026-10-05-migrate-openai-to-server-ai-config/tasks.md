# Tasks

The completed tasks below record implementation and verification, including the shipped-configuration revision in section 5. Final review aligned the evaluation baseline with production settings and removed the duplicate example configuration; custom configuration starts from a copy of `server.json`.

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
- [x] 4.3 Run `openspec validate migrate-openai-to-server-ai-config --strict`; verify artifacts consistently describe configuration extraction and implementation task status reflects the current implementation.


## 5. Required shipped configuration revision

- [x] 5.1 Promote the production configuration to `config/ai/server.json`; select it for unset/blank `AI_CONFIG_PATH`, and keep evaluation selection independent through its shipped baseline. Resolve bundled files from the application root in development and built runtime; verify custom relative paths still resolve from cwd.
- [x] 5.2 Remove hardcoded production/evaluation generation defaults and legacy cloning/source metadata. Resolve settings only from the selected file plus validated evaluation runner overrides; custom files replace shipped files without merging. Preserve evaluation cache behavior and existing service invocation/error handling.
- [x] 5.3 Require `maxOutputTokens` and `maxRetries` for every operation in runtime validation and editor JSON Schema; update examples accordingly. Leave omitted temperature, reasoning, and timeout absent; verify model compatibility and required-field errors.
- [x] 5.4 Require production credentials for shipped and custom files before accepting requests. Verify missing/unreadable/invalid selected files and missing credentials fail initialization without another file or hardcoded fallback.
- [x] 5.5 Update configuration/deployment/environment documentation and evaluation reporting metadata for shipped versus custom sources. Verify Docker includes the shipped production file and independent evaluation baseline, and automatically selects the production file without a path override.
- [x] 5.6 Add focused regression coverage for unset/blank paths, bundled paths independent of cwd, custom replacement, required settings, omitted optional settings, evaluation override precedence/isolation, selected-file failures, credential failures, and preserved dashboard error/timeout fallback.
- [x] 5.7 Run focused tests, `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`; run `openspec validate migrate-openai-to-server-ai-config --strict` and confirm artifacts and implementation match the revised flow.

## 6. Credential-aware live prompt tests

- [x] 6.1 Skip live Jest prompt suites without nonblank credentials after dotenv loading, before dataset reads or provider invocation. Exclude unit-test placeholder setup from live suites and retain direct runner credential validation.
- [x] 6.2 Document skip behavior and verify absent/blank credentials skip all live suites, dotenv credentials select suites for execution, and mocked unit checks remain runnable; run type-check, lint, tests, build, and strict OpenSpec validation.

## Final archive verification

On 2026-10-05, type-check, lint, build, and strict change validation passed. All 72 unit-test suites (511 tests) passed. Lint reported two existing warnings in dashboard aggregation tests. The full test suite required local HTTP listener access outside the sandbox. Live paid prompt evaluations were not run as part of archiving.

Both synchronized AI main specs passed strict validation. Repository-wide spec validation reports existing missing Purpose sections in `contribution-guidance`, `file-header-scaffolding`, and `repository-licensing`; these unrelated specs were left unchanged.
