# OpenRouter Classification Evaluation

## Purpose

Evaluate Jev and OpenAI Decisions through one OpenRouter route on shared stored-result evidence, with isolated execution and inspectable cross-model results.

## Requirements

### Requirement: Profile selection and evaluation isolation
The system SHALL preserve Jev and OpenAI Decisions smoke/regression evaluations in `stored-results-analysis-openrouter-decisions`, including the existing OpenAI default, and expose Microsoft smoke/regression evaluations through a dedicated `stored-results-analysis-microsoft-decision` project pinned to the Microsoft profile. Selecting the existing OpenRouter project SHALL NOT execute Microsoft suites; selecting the Microsoft project SHALL NOT execute the existing OpenRouter suites. It SHALL use `OPENROUTER_API_KEY` independently of `OPENAI_API_KEY` and `TYPESAFE_API_KEY`. Existing generative OpenAI and direct TypeSafe projects and ordinary tests MUST NOT execute these live suites. Missing or blank credentials SHALL skip live suites before dataset reads or network requests; direct runners SHALL reject missing credentials. Unrecognized profiles SHALL fail clearly rather than select a default model silently.

#### Scenario: OpenRouter credentials only
- **WHEN** a supported profile is selected with a valid OpenRouter credential and shared datasets, without direct-provider credentials
- **THEN** that profile can execute independently of direct-provider environment checks

#### Scenario: Missing credential skips safely
- **WHEN** live suites are collected without a nonblank OpenRouter credential
- **THEN** suites skip without reading datasets or making provider calls

#### Scenario: Existing projects remain isolated
- **WHEN** ordinary tests or the existing OpenAI or TypeSafe evaluation project is selected
- **THEN** no live OpenRouter evaluation runs

#### Scenario: Microsoft project isolation
- **WHEN** the Microsoft project is selected with only a valid OpenRouter key
- **THEN** only Microsoft smoke/regression suites can execute and no direct-provider credential is required

#### Scenario: Missing Microsoft credential
- **WHEN** the Microsoft project is collected with a missing or whitespace-only OpenRouter key
- **THEN** its suites skip before dataset reads or network access

### Requirement: Shared evidence and category policy
Every profile SHALL consume the same existing v1.1.0 smoke/regression dataset artifacts without provider-specific copies. Requests SHALL contain only the diagnostic evidence fields used by the existing Jev evaluation, including spec identity/title, status, duration, retry, execution name, and error message/stack/location. Case names, tags, expected labels, and expected production-output constraints MUST NOT be sent. A named `category` choice SHALL use the five categories and first-match precedence `infra`, `performance`, `script`, `bug`, `other`, with the existing Jev definitions. Explicit network, DNS, connection, TLS, deployment, credential, and external authentication failures SHALL take priority over generic timeouts; insufficient or conflicting evidence SHALL select `other`.

#### Scenario: Expected labels stay local
- **WHEN** a labeled dataset case is classified
- **THEN** only its evidence is submitted and the expected category is used locally after the answer returns

#### Scenario: Infrastructure and performance distinction
- **WHEN** category instructions are constructed for either profile
- **THEN** explicit infrastructure failures outrank generic timeouts and performance constraints in the same policy

### Requirement: Ordered execution with bounded concurrency
The runner SHALL validate a positive integer concurrency limit, issue one classification request per case with zero retries by default, and return predictions in input order with case id and name. It SHALL stop scheduling new work after the first execution failure and settle in-flight work before rejecting. An empty direct-runner input SHALL make no provider calls and produce no claim of measured accuracy; a live suite SHALL reject an empty dataset.

#### Scenario: Out-of-order responses
- **WHEN** responses finish in a different order from their inputs
- **THEN** predictions retain original input order and concurrent requests never exceed the selected limit

#### Scenario: Mid-run failure
- **WHEN** any classification fails or refuses
- **THEN** no new cases are scheduled after the failure is observed and the run fails without a completed-success report

### Requirement: Category scoring and suite thresholds
Evaluation SHALL compute category accuracy as correct predictions divided by evaluated case count, identify each mismatch, and write completed prediction reports before asserting accuracy thresholds. Smoke SHALL require every category to match and regression SHALL require at least 90 percent. Raw fractional provider confidence SHALL NOT be compared to dataset constraints for the production integer confidence scale. Refusals and invalid answers SHALL be execution failures rather than scored successful classifications.

#### Scenario: Regression threshold boundary
- **WHEN** nine of ten valid predictions match their labels
- **THEN** regression meets its threshold and smoke does not; the report contains the mismatch

#### Scenario: Low accuracy remains inspectable
- **WHEN** a completed prediction run falls below its suite threshold
- **THEN** its report is written before the suite rejects acceptance

### Requirement: Reproducible reports and comparisons
Each completed profile/suite run SHALL write timestamped JSON and `latest.json` under an ignored OpenRouter/profile/suite-specific path. Reports SHALL contain gateway, endpoint/API mode, profile, requested and returned model identities, upstream provider where supplied, dataset version and content fingerprint, question-policy version, category accuracy, case predictions, raw confidence/probabilities, duration, actual request/attempt counts, and supplied usage/cost. Unavailable metadata SHALL be explicit, never fabricated or zero-filled. Comparisons SHALL verify identical dataset fingerprints and policy versions, keep model-specific reports separate, and reject incompatible or incomplete runs. Reports MUST NOT contain credentials or complete provider response bodies. The stored answer SHALL contain only the validated decision fields, preserving the provider confidence and probabilities without reinterpretation. Evaluation timestamps and requested/returned model identity SHALL be retained because model aliases can change. Three-profile comparisons SHALL require exactly one complete report each for Jev, OpenAI Decisions, and Microsoft, all from the OpenRouter alpha Decisions route, with the expected pinned requested model per profile. They SHALL verify matching suite, dataset version/fingerprint, policy version, and complete unique case identities and labels; reject inconsistent aggregates and invalid provenance; and expose per-profile accuracy, mismatches, measured latency, request/attempt counts, and available actual usage/cost. Direct TypeSafe and direct OpenAI reports SHALL NOT enter this comparison. Existing two-report Jev/OpenAI comparison calls and their output SHALL remain supported.

#### Scenario: Two profiles compare the same baseline
- **WHEN** completed Jev and OpenAI runs use matching dataset fingerprints and policy versions
- **THEN** a local comparison identifies each model and compares category accuracy, mismatches, duration, and available usage/cost

#### Scenario: Dataset mismatch
- **WHEN** reports use different dataset contents or policy versions
- **THEN** comparison refuses to present them as an identical-dataset experiment

#### Scenario: Billing information is unavailable
- **WHEN** a provider does not supply cost or a usage detail
- **THEN** the report marks it unavailable and does not report a zero cost or estimated provider usage as actual

#### Scenario: Three models share the same experiment
- **WHEN** complete OpenRouter Jev, OpenAI, and Microsoft reports use identical suite, dataset, policy, and case identities
- **THEN** comparison presents all three model summaries and their available metrics without choosing or enabling a production model

#### Scenario: Incompatible three-model reports
- **WHEN** a report is missing, duplicated, incomplete, from another route, uses the wrong requested model, or differs in dataset, policy, or case identity
- **THEN** three-model comparison rejects instead of presenting the reports as one experiment

#### Scenario: Validated answer storage
- **WHEN** a completed Microsoft response includes extra provider fields
- **THEN** the local report contains its validated decision answer and specified comparison metadata, without retaining the complete response or unknown fields

#### Scenario: Existing comparison compatibility
- **WHEN** the existing two-report Jev/OpenAI comparison is invoked with compatible reports
- **THEN** its supported call and output remain available without requiring a Microsoft report

### Requirement: Production compatibility and evidence disclosure
The evaluation SHALL remain separate from production analysis, database persistence, REST/MCP contracts, review state, and feedback. It SHALL NOT invent conclusions or error-quality explanations, calibrate production confidence, or automatically enable a provider. Documentation and delivery evidence SHALL distinguish mocked verification from actual live access and smoke/regression outcomes for each profile. The current baseline's lack of performance-category cases SHALL be documented without claiming complete five-category live coverage. Microsoft support and three-model comparison SHALL remain research-only and SHALL NOT automatically recommend, select, persist, or enable a production classifier. Documentation SHALL distinguish per-case gateway-inclusive request latency from whole-run duration and SHALL disclose that single runs and mutable model aliases limit reproducibility.

#### Scenario: Mock-only verification
- **WHEN** only mocked tests and repository checks have run
- **THEN** evidence states that live evaluations were not run and claims no measured provider accuracy or access

#### Scenario: Fractional decision confidence
- **WHEN** a provider returns a confidence of 0.87
- **THEN** it remains local evaluation metadata and does not update production analysisConfidence
