# OpenRouter Decisions Adapter

## Purpose

Provide a reusable, validated boundary for probabilistic decisions through OpenRouter without coupling decision consumers to generative model contracts.

## ADDED Requirements

### Requirement: OpenRouter decision wire contract
The adapter SHALL send authenticated JSON requests to `https://openrouter.ai/api/alpha/decisions` using a selected model, shared `state`, and a nonempty object of uniquely named questions. It SHALL support documented `noul`, `choice`, and `score` request and answer variants. Direct OpenAI `input` and question-array payloads and generative-only options SHALL be rejected instead of silently forwarded or ignored.

#### Scenario: Multiple named decisions
- **WHEN** a valid request contains a boolean proposition, a category choice, and an ordered scoring rubric
- **THEN** the adapter sends the corresponding OpenRouter question variants and returns answers correlated with their original names and types

#### Scenario: Unsupported invocation options
- **WHEN** a caller supplies generative options such as temperature or a direct OpenAI request shape
- **THEN** validation fails before network access

### Requirement: Credentials and explicit model configuration
The adapter SHALL require a nonblank `OPENROUTER_API_KEY` or explicitly injected credential and a validated nonblank model identifier. TP-5 SHALL provide evaluation profiles only for Jev and OpenAI Decisions. It SHALL NOT add Microsoft model integration, profiles, evaluation suites, or comparison requirements. Requests SHALL disable automatic provider fallback and SHALL NOT silently substitute a model or credential from another provider.

#### Scenario: Missing credentials
- **WHEN** direct execution is attempted with no credential or a whitespace-only credential
- **THEN** the adapter rejects before making a request and does not consult OpenAI or TypeSafe credentials

#### Scenario: Explicit model selection
- **WHEN** the OpenAI Decisions profile is selected
- **THEN** the request uses its configured OpenRouter model and cannot fall back to Jev or a generative model

### Requirement: Runtime validation and answer correlation
The adapter SHALL validate external responses before exposing successful answers. Answer names and count MUST match the requested question set, each answer type MUST match its question, and choice values and probability keys MUST match supplied criteria. Probabilities and confidence values where defined MUST be finite and within their documented ranges; discrete distributions MUST be complete and normalized within a documented numeric tolerance. Scores MUST use valid rubric indices and remain within the documented score range. Model and supplied usage/cost fields MUST be validated; unavailable metadata MUST remain explicitly unavailable rather than invented or zero-filled. Returned model identifiers SHALL be retained separately from requested identifiers because provider snapshots can differ from aliases.

#### Scenario: Missing or unrelated answers
- **WHEN** an answer is missing, an extra name appears, or a question receives the wrong answer type
- **THEN** the adapter rejects the response as invalid without manufacturing an answer

#### Scenario: Invalid choice distribution
- **WHEN** a category answer contains an unknown choice, missing category, nonfinite probability, or invalid distribution
- **THEN** the adapter rejects the response and does not normalize it into a successful prediction

#### Scenario: Missing optional billing metadata
- **WHEN** valid answers arrive without a cost or optional token detail
- **THEN** the adapter retains the answers and explicitly marks that metadata unavailable

### Requirement: Explicit provider failures and invalid responses
The adapter SHALL expose provider transport failures through stable error kinds. Malformed JSON, incomplete responses, authentication errors, exhausted credit, rate limits, timeouts, network errors, upstream failures, and undocumented refusal-shaped or error-shaped successful responses MUST NOT become successful answers or the category `other`. Because the current OpenRouter Decisions contract does not document a refusal payload shape, such successful response bodies SHALL fail validation as `invalid_response`. Failure details exposed in logs or reports MUST exclude credentials.

#### Scenario: Undocumented refusal-shaped answer
- **WHEN** a successful response contains an undocumented refusal-shaped answer
- **THEN** the adapter rejects the response as `invalid_response` without manufacturing a prediction

#### Scenario: Upstream or error-shaped failure
- **WHEN** OpenRouter returns an HTTP error or a successful response with an undocumented error-shaped answer
- **THEN** the caller receives a stable transport error or `invalid_response`, rather than fabricated decision output

### Requirement: Bounded timeout and retry policy
The adapter SHALL validate a positive timeout and nonnegative bounded retry count. Zero retries SHALL cause at most one transport attempt. Configured retries SHALL apply only to documented transient failures, use bounded backoff, and preserve attempt accounting; invalid requests, invalid responses, and authentication failures SHALL NOT be retried. Evaluation profiles SHALL default to zero retries.

#### Scenario: Evaluation timeout
- **WHEN** an evaluation request exceeds its configured timeout with zero retries
- **THEN** the request is aborted, exactly one attempt is recorded, and execution fails

#### Scenario: Configured transient retry
- **WHEN** a retryable transport failure occurs and retries are explicitly enabled
- **THEN** attempts stop at the configured bound and the actual attempt count is retained
