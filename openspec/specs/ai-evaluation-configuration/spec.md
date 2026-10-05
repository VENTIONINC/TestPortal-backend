# ai-evaluation-configuration Specification

## Purpose

Keep prompt evaluations reproducible through independent model configuration and effective invocation metadata, regardless of production AI settings.

## Requirements

### Requirement: Independent versioned evaluation configuration
Evaluation runs SHALL use their own version 1 profile configuration selected by `AI_EVAL_CONFIG_PATH` or a checked-in baseline, with mappings for stored-results analysis, error formatting, and solution suggestions. They SHALL NOT inherit production configuration or require server initialization. Missing, unreadable, or invalid selected evaluation files SHALL fail before provider invocation without another file or hardcoded settings fallback. Unset or blank `AI_EVAL_CONFIG_PATH` SHALL select the shipped baseline relative to the application root. Custom files SHALL replace the baseline entirely without merging.

#### Scenario: Production configuration changes
- **WHEN** `AI_CONFIG_PATH` selects a different model or even an unreadable production file
- **THEN** an evaluation using its valid independent configuration SHALL retain its configured model and generation settings

#### Scenario: Evaluation-only configuration
- **WHEN** `AI_EVAL_CONFIG_PATH` selects a valid alternative model profile
- **THEN** evaluation requests SHALL use that profile without changing production behavior

### Requirement: File-owned evaluation baseline and explicit overrides
The shipped evaluation baseline file SHALL contain OpenAI `gpt-6-luna` low for stored-results analysis with output limit 4000 and Luna none for error formatting with output limit 500, both without explicit temperature. Solution suggestions SHALL retain `gpt-4.1-mini`, no reasoning override, temperature 0.3, and output limit 700. The shipped evaluation baseline SHALL match production model and generation settings for these three operations while remaining independently selectable. All mappings SHALL use two retries. All evaluation mappings SHALL require `maxOutputTokens` and `maxRetries`. Omitted temperature and reasoning SHALL remain absent without application defaults. Disabled cache SHALL remain evaluation-runner behavior. Existing runner model/temperature overrides SHALL remain supported, take precedence over evaluation file settings, and undergo the same capability validation.

#### Scenario: Baseline evaluation
- **WHEN** an existing suite runs without an explicit evaluation path or runner overrides
- **THEN** it SHALL load its settings from the shipped evaluation baseline, independently of production settings

#### Scenario: Unsupported runner override
- **WHEN** a runner override creates an unsupported model/temperature/reasoning combination
- **THEN** the evaluation SHALL reject it before invoking the provider

#### Scenario: Missing or invalid baseline
- **WHEN** no custom evaluation path is supplied and the shipped evaluation baseline is missing, unreadable, or invalid
- **THEN** initialization SHALL fail before provider invocation without hardcoded suite defaults

#### Scenario: Incomplete custom evaluation configuration
- **WHEN** a custom evaluation file omits required operation mappings or generation fields
- **THEN** initialization SHALL fail without inheriting values from the baseline

### Requirement: Effective evaluation metadata
Evaluation results SHALL include suite/operation, prompt version, configuration version/source identifying the shipped evaluation baseline or custom file, profile, provider, requested model, provider-reported model when already available, effective reasoning, and generation settings. Suite reporting SHALL expose this metadata on successful runs and assertion failures. Metadata SHALL NOT include credentials, prompt payloads, or reasoning traces, and SHALL NOT claim a resolved snapshot when the provider reports only an alias.

#### Scenario: Evaluation with runner overrides
- **WHEN** an evaluation succeeds after applying explicit runner settings
- **THEN** its metadata SHALL identify the effective settings sent to the provider, including those overrides

#### Scenario: Quality assertions fail
- **WHEN** model output violates a suite expectation
- **THEN** the report SHALL identify the invocation configuration and prompt version alongside the existing failure details

### Requirement: Existing evaluation behavior with independent settings
Evaluations SHALL use shared configuration validation and resolution while retaining their existing provider invocation, response handling, prompts, and suite expectations. No shared invocation framework SHALL be required. Evaluation initialization SHALL validate required provider credentials without exposing their values.

#### Scenario: Incomplete structured output
- **WHEN** an evaluation provider response is incomplete or violates its selected schema
- **THEN** it SHALL be rejected as a provider/contract failure rather than accepted as a successful evaluation response

#### Scenario: Missing credentials for live prompt tests
- **WHEN** a live Jest prompt suite is selected without a nonblank `OPENAI_API_KEY` after loading environment configuration
- **THEN** it SHALL report the suite as skipped before reading datasets or invoking the provider
- **AND** test setup SHALL NOT supply placeholder credentials to live suites or prevent dotenv from loading a real key

#### Scenario: Direct runner lacks credentials
- **WHEN** an evaluation runner is called directly without required OpenAI credentials
- **THEN** it SHALL fail before provider invocation with a credential-name error that excludes secret values

#### Scenario: Mocked unit tests
- **WHEN** unit tests mock provider invocation
- **THEN** they SHALL remain runnable without real OpenAI credentials, with any placeholder credentials confined to unit-test setup
