# Spec Delta

## Purpose

Enable opt-in Jev classification experiments on shared stored-result datasets, producing local category evaluation evidence without changing production analysis semantics.

## ADDED Requirements

### Requirement: Evaluation isolation and credentials
The system SHALL expose Jev smoke and regression evaluations through the separate `stored-results-analysis-typesafe` project, using `TYPESAFE_API_KEY` independently of `OPENAI_API_KEY`. Ordinary repository tests and the existing stored-results-analysis project MUST NOT make Jev requests. Live Jev suites SHALL skip when the key is missing or whitespace-only, before reading datasets or calling the provider. Direct evaluation execution without a nonblank key SHALL fail with a clear credential error.

#### Scenario: Existing tests stay isolated
- **WHEN** a user runs ordinary tests or selects the existing stored-results-analysis project
- **THEN** no live Jev evaluation is executed

#### Scenario: Evaluation does not require an OpenAI credential
- **WHEN** the Jev project is selected with a valid TypeSafe key and generated datasets, without an OpenAI key
- **THEN** the Jev suites can execute independently of the OpenAI environment setup

#### Scenario: Uncredentialed suites skip
- **WHEN** the Jev project is collected with a missing or whitespace-only TypeSafe key
- **THEN** its live suites are reported as skipped without dataset reads or provider requests

#### Scenario: Direct uncredentialed execution fails
- **WHEN** a user directly executes the evaluation without a nonblank TypeSafe key
- **THEN** execution rejects with a credential error before any provider request

### Requirement: Shared datasets and category-only predictions
The evaluation SHALL consume the existing stored-results-analysis smoke/regression datasets without a separate provider-specific copy. For every successful input case it SHALL return a prediction associated with that case's id and name, its expected and actual category, raw provider confidence, probabilities for the five categories `infra`, `performance`, `script`, `bug`, and `other`, reported model, and input/output token counts. Only result evidence SHALL be submitted for classification; expected categories MUST NOT be supplied as provider input.

#### Scenario: Predictions correspond to cases
- **WHEN** the provider returns successful predictions for multiple dataset cases
- **THEN** every case has one associated prediction in input order, including provider metadata and category probabilities

#### Scenario: Ground truth remains outside classification input
- **WHEN** a case is submitted for classification
- **THEN** its result fields are supplied and its expected category is used only for evaluation after the prediction

### Requirement: Category decision policy
Classification SHALL use the first matching category in the order `infra`, `performance`, `script`, `bug`, `other`. Explicit network, DNS, connection, TLS, deployment, credential, or external authentication failures SHALL be infrastructure evidence; timeouts without explicit network error codes and performance constraints SHALL be performance evidence. Automation defects SHALL be script evidence and application defects SHALL be bug evidence. Insufficient or conflicting evidence SHALL select `other`.

#### Scenario: Explicit infrastructure evidence outranks generic timeout evidence
- **WHEN** a result contains an explicit network failure alongside a timeout
- **THEN** the classification policy prioritizes `infra` over `performance`

#### Scenario: Insufficient evidence
- **WHEN** the result does not establish a category or contains conflicting evidence
- **THEN** the classification policy selects `other`

### Requirement: Category accuracy and suite acceptance
Evaluation SHALL compute accuracy as correct category predictions divided by case count, return mismatches with case names and expected/actual categories, and measure duration and aggregate input/output/total tokens. A successful run SHALL record one classification request per case. Smoke acceptance SHALL require all categories to match; regression acceptance SHALL require accuracy of at least 90 percent. Reports SHALL be written before category acceptance assertions so unsuccessful accuracy checks remain inspectable. Provider failures SHALL fail execution and MUST NOT be reported as successful classifications or fabricated categories.

#### Scenario: Category mismatch is measurable
- **WHEN** one of ten successful category predictions differs from its expectation
- **THEN** accuracy is 0.9, the mismatch is identified, regression meets its threshold, and smoke does not meet its all-correct threshold

#### Scenario: Provider execution fails
- **WHEN** a classification request fails
- **THEN** evaluation reports an execution error instead of a successful complete report with invented predictions

### Requirement: Local evaluation reports
Completed evaluation SHALL write a timestamped JSON report and a `latest.json` report under provider/suite-specific directories. Reports SHALL include provider, model, suite, case and correct counts, accuracy, duration, request count, token usage, and per-case expected/actual categories, correctness, raw confidence, category probabilities, and token counts. Generated reports SHALL remain excluded from Git and SHALL NOT contain credentials.

#### Scenario: Completed smoke evaluation produces reusable evidence
- **WHEN** a smoke run completes its predictions
- **THEN** both report files contain its metrics and per-case metadata in the TypeSafe smoke directory, and Git ignores those generated files

### Requirement: Production contract remains unchanged
The evaluation SHALL remain separate from production analysis, persistence, REST/MCP output, and review/feedback behavior. Raw provider confidence SHALL NOT be converted to or used as the production integer 1–5 `analysisConfidence`. Category-only predictions SHALL NOT invent conclusions, error-quality ratings, or explanations to satisfy the production response contract.

#### Scenario: Evaluation returns fractional confidence
- **WHEN** the provider returns category confidence of 0.87 and category probabilities
- **THEN** these values remain evaluation metadata without updating production analysis fields or manufacturing missing analysis output

### Requirement: Reproducible instructions and evidence boundaries
Documentation SHALL describe credential configuration, dataset generation, project-specific smoke/regression commands, report locations, acceptance thresholds, and the distinction between category predictions and full production analysis. Delivery verification SHALL identify whether live provider evaluations ran separately from isolated tests and repository checks.

#### Scenario: Delivery uses isolated tests only
- **WHEN** implementation is verified without live provider execution
- **THEN** its recorded evidence states that live evaluation was not run and makes no claim of measured live accuracy
