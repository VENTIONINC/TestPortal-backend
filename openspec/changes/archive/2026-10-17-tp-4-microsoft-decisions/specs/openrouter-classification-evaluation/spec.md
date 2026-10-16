# Spec Delta

## MODIFIED Requirements

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
