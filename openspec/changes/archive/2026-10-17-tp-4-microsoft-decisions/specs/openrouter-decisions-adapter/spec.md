# Spec Delta

## MODIFIED Requirements

### Requirement: Credentials and explicit model configuration
The adapter SHALL require a nonblank `OPENROUTER_API_KEY` or explicitly injected credential and a validated nonblank model identifier. Evaluation SHALL provide pinned OpenRouter profiles for Jev (`typesafe/jev-1.13`), OpenAI Decisions (`openai/gpt-6-luna-decisions`), and Microsoft (`microsoft/microsoft-decision-1`). Unsupported model overrides SHALL be rejected before network access; the generic adapter SHALL remain reusable for explicitly configured model identifiers. Requests SHALL disable automatic provider fallback and SHALL NOT silently substitute a model or credential from another provider.

#### Scenario: Missing credentials
- **WHEN** direct execution is attempted with no credential or a whitespace-only credential
- **THEN** the adapter rejects before making a request and does not consult OpenAI or TypeSafe credentials

#### Scenario: Explicit model selection
- **WHEN** the OpenAI Decisions profile is selected
- **THEN** the request uses its configured OpenRouter model and cannot fall back to Jev or a generative model

#### Scenario: Microsoft profile selection
- **WHEN** the Microsoft evaluation is selected
- **THEN** requests use microsoft/microsoft-decision-1 through OpenRouter with the same credential boundary and fallback prohibition

#### Scenario: Unsupported model override
- **WHEN** an evaluation caller supplies an arbitrary model override
- **THEN** configuration fails explicitly before any provider request instead of silently ignoring or accepting the override

### Requirement: Explicit provider failures and invalid responses
The adapter SHALL expose provider transport failures through stable error kinds. Malformed JSON, incomplete responses, authentication errors, exhausted credit, rate limits, timeouts, network errors, upstream failures, and undocumented refusal-shaped or error-shaped successful responses MUST NOT become successful answers or the category `other`. Because the current OpenRouter Decisions contract does not document a refusal payload shape, such successful response bodies SHALL fail validation as `invalid_response`. Input-limit errors, including HTTP 413 and provider context-limit failures returned as HTTP 400, SHALL fail execution without truncating evidence, retrying a permanent failure, or manufacturing a prediction. Failure details exposed in logs or reports MUST exclude credentials.

#### Scenario: Undocumented refusal-shaped answer
- **WHEN** a successful response contains an undocumented refusal-shaped answer
- **THEN** the adapter rejects the response as `invalid_response` without manufacturing a prediction

#### Scenario: Upstream or error-shaped failure
- **WHEN** OpenRouter returns an HTTP error or a successful response with an undocumented error-shaped answer
- **THEN** the caller receives a stable transport error or `invalid_response`, rather than fabricated decision output


#### Scenario: Oversized evidence
- **WHEN** the provider rejects the submitted evidence with HTTP 413 or a context-limit HTTP 400
- **THEN** execution rejects with the HTTP status and actual attempt count, produces no successful prediction, and does not retry or shorten the evidence
