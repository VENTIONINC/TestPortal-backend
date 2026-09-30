# Spec Delta

## Purpose

Allow server operators to configure models and generation settings for each AI operation while preserving legacy deployment behavior and response contracts.

## ADDED Requirements

### Requirement: Server configuration profiles and operation mappings
The system SHALL accept a version 1 JSON configuration selected by `AI_CONFIG_PATH`, containing named OpenAI model profiles and mappings for stored-results analysis, error formatting, solution suggestions, and dashboard insights. Credentials SHALL remain in environment variables. Configuration SHALL be server-wide and SHALL NOT be selectable through user or request data.

#### Scenario: Operations select different models
- **WHEN** analysis and formatting reference different valid profiles
- **THEN** each operation SHALL invoke the model and reasoning configuration from its own profile

#### Scenario: Shared profile with distinct generation settings
- **WHEN** two operations share a profile and specify different output limits
- **THEN** each operation SHALL use its own limit without changing the shared model or reasoning configuration

### Requirement: Configuration validation and initialization
The system SHALL load and validate supplied configuration before accepting requests and SHALL reject invalid JSON, unsupported versions/providers/models, unknown fields, invalid numeric settings, and unresolved profile references. Relative paths SHALL resolve against the working directory. Configuration SHALL remain fixed until restart.

#### Scenario: Invalid explicit configuration
- **WHEN** a supplied configuration is unreadable or contains an invalid profile reference
- **THEN** startup SHALL fail with a field/path-specific error and SHALL NOT use legacy defaults instead

#### Scenario: File changes after startup
- **WHEN** an operator edits the file after successful initialization
- **THEN** running operations SHALL continue using the initialized configuration until restart

### Requirement: Legacy defaults and credentials
When no nonempty configuration path is supplied, the system SHALL retain OpenAI `gpt-4.1-mini`, no reasoning override, and existing operation-specific temperatures, output limits, retries, and insights deadline. Explicit file configuration SHALL require the selected provider's credentials at startup. Legacy startup SHALL remain possible without AI credentials, with credentials checked before any AI invocation.

#### Scenario: Existing deployment with no AI key
- **WHEN** the server starts without `AI_CONFIG_PATH` or `OPENAI_API_KEY`
- **THEN** startup SHALL succeed and any attempted AI invocation SHALL fail clearly through its existing error or fallback behavior before sending a provider request

#### Scenario: Explicit configuration lacks credentials
- **WHEN** a valid file is supplied without the required `OPENAI_API_KEY`
- **THEN** startup SHALL fail with an actionable credential-name error without revealing secrets

#### Scenario: Legacy generation settings
- **WHEN** no configuration file is supplied
- **THEN** analysis, formatting, suggestion, and insights SHALL retain temperatures 0, 0.7, 0.3, and 0.2; output limits 4000, 500, 700, and 400; retries 2, 2, 2, and 1; and the insights eight-second deadline

### Requirement: Model-aware parameter validation
The system SHALL validate supported model identifiers, reasoning effort values, generation bounds, and API compatibility. Explicitly unsupported settings SHALL be rejected. Inherited temperature defaults SHALL be omitted when prohibited by the selected model/reasoning combination. Documented reasoning generation limits SHALL account for both reasoning and final response tokens.

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
The system SHALL provide editor JSON Schema and credential-free examples matching its versioned configuration structure. Deployment documentation SHALL explain file provisioning, defaults, credentials, supported model combinations, and restart behavior. Configuration errors and metadata SHALL NOT disclose credentials or entire configuration/environment payloads.

#### Scenario: Example file used in production image
- **WHEN** an operator follows the documented image example and selects its bundled config path
- **THEN** the file SHALL exist in the runtime image and be valid under the published schema

#### Scenario: Secret or unknown field supplied in JSON
- **WHEN** a JSON profile contains an API key field or another unknown field
- **THEN** validation SHALL reject the field without printing its value
