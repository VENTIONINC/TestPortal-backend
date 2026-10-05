# server-ai-configuration Specification

## Purpose

Allow server operators to configure models and generation settings for each AI operation using required shipped configuration while preserving response contracts.

## Requirements

### Requirement: Server configuration profiles and operation mappings
The system SHALL accept a version 1 JSON configuration loaded from the shipped `config/ai/server.json` unless a nonempty `AI_CONFIG_PATH` selects a complete custom replacement, containing named OpenAI model profiles and mappings for stored-results analysis, error formatting, solution suggestions, and dashboard insights. Credentials SHALL remain in environment variables. Each operation mapping SHALL require a profile reference, `maxOutputTokens`, and `maxRetries`. Optional temperature, reasoning, and timeout SHALL remain absent when omitted, without injecting application defaults. Custom configuration SHALL NOT merge with the shipped file. Configuration SHALL be server-wide and SHALL NOT be selectable through user or request data.

#### Scenario: Operations select different models
- **WHEN** analysis and formatting reference different valid profiles
- **THEN** each operation SHALL invoke the model and reasoning configuration from its own profile

#### Scenario: Shared profile with distinct generation settings
- **WHEN** two operations share a profile and specify different output limits
- **THEN** each operation SHALL use its own limit without changing the shared model or reasoning configuration

### Requirement: Configuration validation and initialization
The system SHALL load and validate the selected shipped or custom configuration before accepting requests and SHALL reject invalid JSON, unsupported versions/providers/models, unknown fields, invalid numeric settings, and unresolved profile references. Custom relative paths SHALL resolve against the working directory. Bundled paths SHALL resolve against the application root in development and built runtime, independently of the working directory. Configuration SHALL remain fixed until restart.

#### Scenario: Invalid explicit configuration
- **WHEN** a supplied configuration is unreadable or contains an invalid profile reference
- **THEN** startup SHALL fail with a field/path-specific error and SHALL NOT use the shipped file or hardcoded settings instead

#### Scenario: File changes after startup
- **WHEN** an operator edits the file after successful initialization
- **THEN** running operations SHALL continue using the initialized configuration until restart

### Requirement: Shipped configuration and startup credentials
When `AI_CONFIG_PATH` is unset or blank, the system SHALL load the shipped production file. That file SHALL contain the baseline model and generation settings; the loader and resolver SHALL NOT duplicate these settings as hardcoded defaults. Both shipped and custom configurations SHALL require the selected provider's credentials at startup.

#### Scenario: Shipped production configuration
- **WHEN** the server starts with an unset or blank `AI_CONFIG_PATH` and valid required credentials
- **THEN** it SHALL load the shipped file containing OpenAI `gpt-6-luna` with low reasoning for analysis and none reasoning for formatting, both without explicit temperature; suggestions and insights SHALL retain `gpt-4.1-mini` without reasoning override and temperatures 0.3 and 0.2; output limits 4000, 500, 700, and 400; and retries 2, 2, 2, and 1 for analysis, formatting, suggestion, and insights respectively

#### Scenario: Custom replacement configuration
- **WHEN** a nonempty `AI_CONFIG_PATH` selects a valid complete file
- **THEN** all operations SHALL use that file without inheriting settings from the shipped file

#### Scenario: Shipped file unavailable or invalid
- **WHEN** no custom path is supplied and the shipped file is missing, unreadable, or invalid
- **THEN** startup SHALL fail with a clear file or field error without using hardcoded settings

#### Scenario: Required generation settings omitted
- **WHEN** either selected file omits an operation's `maxOutputTokens` or `maxRetries`
- **THEN** startup SHALL fail with a field-specific error without inheriting baseline values

#### Scenario: Configuration lacks credentials
- **WHEN** either a shipped or custom configuration is selected without the required `OPENAI_API_KEY`
- **THEN** startup SHALL fail with an actionable credential-name error without revealing secrets

### Requirement: Model-aware parameter validation
The system SHALL validate supported model identifiers, reasoning effort values, generation bounds, and API compatibility. Explicitly unsupported settings SHALL be rejected. Omitted temperature SHALL remain absent in the effective settings for every supported model. Documented reasoning generation limits SHALL account for both reasoning and final response tokens.

#### Scenario: Reasoning requested on a non-reasoning model
- **WHEN** a profile configures reasoning effort for `gpt-4.1-mini`
- **THEN** configuration validation SHALL reject the combination before any provider request

#### Scenario: Valid reasoning profile
- **WHEN** an operation selects a verified reasoning model with supported settings
- **THEN** its provider request SHALL carry those reasoning settings through the compatible API path

#### Scenario: Temperature prohibited by selected configuration
- **WHEN** the selected model/reasoning configuration prohibits temperature
- **THEN** an omitted temperature SHALL remain absent in the effective request and an explicitly supplied temperature SHALL cause a configuration error

### Requirement: Existing operation behavior
All four operations SHALL honor their resolved configuration and preserve their existing public response shapes, prompts, domain behavior, and operation-specific failure behavior. Existing structured-output handling, response validation, and failure behavior SHALL remain in each operation. Configured SDK request timeouts SHALL remain distinct from the existing eight-second dashboard fallback deadline. This change SHALL NOT introduce new response or cancellation policies.

#### Scenario: Invalid structured result
- **WHEN** the provider returns a result that violates the operation's response schema
- **THEN** the operation SHALL fail through its existing error behavior rather than return or persist it as valid analysis

#### Scenario: Insights exceeds its deadline
- **WHEN** insights generation exceeds its existing eight-second overall deadline
- **THEN** the operation SHALL return its existing fallback text using its existing timeout behavior

#### Scenario: Suggestion requires preliminary analysis
- **WHEN** a suggestion request also performs stored-results analysis
- **THEN** the preliminary analysis SHALL use the analysis mapping and the suggestion SHALL use the suggestion mapping

### Requirement: Configuration documentation and secret protection
The system SHALL provide editor JSON Schema and required credential-free shipped configuration matching its versioned configuration structure. Custom configuration documentation SHALL use a copy of `config/ai/server.json` as its starting point. Deployment documentation SHALL explain file provisioning, defaults, credentials, supported model combinations, and restart behavior. Configuration errors and metadata SHALL NOT disclose credentials or entire configuration/environment payloads.

#### Scenario: Shipped file used in production image
- **WHEN** the production image starts without a custom config path and with required credentials
- **THEN** the shipped production file SHALL exist in the runtime image, validate under the published schema, and be selected automatically

#### Scenario: Secret or unknown field supplied in JSON
- **WHEN** a JSON profile contains an API key field or another unknown field
- **THEN** validation SHALL reject the field without printing its value
