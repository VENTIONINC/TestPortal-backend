## Purpose

Allow server operators to select Jev for similar-error suggestions while retaining the legacy default, isolating project data and making credential and service failures explicit.

## ADDED Requirements

### Requirement: Server selects the similarity provider
The system SHALL use legacy matching when `ERROR_SIMILARITY_AI_ENABLED` is absent or false and SHALL use Jev when true for single and bulk reviews. The setting SHALL accept trimmed case-insensitive true/false and SHALL reject other explicit values at startup. Disabled mode SHALL preserve legacy decisions for eligible same-project data.

#### Scenario: Default deployment
- **WHEN** the flag and TypeSafe key are absent
- **THEN** reviews use legacy matching without making TypeSafe requests

#### Scenario: Explicit enablement
- **WHEN** the flag is true and credentials are configured
- **THEN** both single and bulk reviews use Jev for new suggestions

#### Scenario: Invalid flag
- **WHEN** the flag is set to an unsupported value such as yes
- **THEN** server startup fails with a configuration error

### Requirement: Jev credentials remain server-side
The server MUST require a non-empty `TYPESAFE_API_KEY` when Jev is enabled and MUST NOT expose the key through client responses or logs.

#### Scenario: Missing or blank key
- **WHEN** Jev is enabled and the key is absent or whitespace-only
- **THEN** startup fails before requests are accepted and identifies the missing setting without revealing credentials

#### Scenario: Disabled Jev
- **WHEN** Jev is disabled and no TypeSafe key is supplied
- **THEN** the missing key does not prevent startup or legacy review

### Requirement: Suggestions respect project boundaries
In either mode the system MUST restrict candidate errors and source issues to the target error's project, MUST exclude the target itself, and MUST reject targets whose project ownership cannot be established consistently. Retrieval SHALL consider at most 100 latest eligible errors of the same type with issue assumptions.

#### Scenario: Identical error in another project
- **WHEN** an otherwise matching historical error or source issue belongs to another project
- **THEN** it is not scored or linked to the target

#### Scenario: Invalid target ownership
- **WHEN** the target has no resolvable project or inconsistent execution/spec projects
- **THEN** review fails without calling Jev or creating a suggestion

### Requirement: Jev chooses the strongest qualifying suggestion
Enabled review SHALL judge original error messages and normalized call logs/stacks with Jev, without legacy length or string-score gates. It SHALL use model `jev-1.13.0` and minimum probability 0.8 initially, evaluate all eligible candidates, and choose the highest qualifying probability. Equal probabilities SHALL prefer the more recent candidate then ascending candidate ID. The chosen source association SHALL prefer confirmed assumptions, otherwise highest assumption score, with ascending assumption ID resolving ties.

#### Scenario: Later candidate is stronger
- **WHEN** eligible candidates score 0.85 and 0.95
- **THEN** the issue associated with the 0.95 candidate is suggested

#### Scenario: Threshold boundary
- **WHEN** the highest candidate probability is 0.8
- **THEN** it qualifies for an unconfirmed suggestion

#### Scenario: No match
- **WHEN** no eligible candidates exist or every probability is below 0.8
- **THEN** review succeeds without creating an assumption

#### Scenario: Different message lengths
- **WHEN** an eligible candidate message is more than 50 percent longer than the target
- **THEN** enabled review still evaluates the pair with Jev

### Requirement: Suggestions preserve user control
Jev-created assumptions SHALL remain unconfirmed bot suggestions and store the selected probability as score. Existing target assumptions MUST NOT be replaced. Enabled review SHALL skip external calls for already assigned targets and SHALL prevent duplicate suggestions or replacement of assignments made during scoring. Single and bulk review response shapes SHALL remain compatible.

#### Scenario: Existing or concurrent assignment
- **WHEN** the target has an assumption before evaluation or receives one while evaluation is running
- **THEN** the existing assumption is preserved and no new bot assumption is created

#### Scenario: Successful new suggestion
- **WHEN** a candidate qualifies and its same-project association remains eligible at persistence time
- **THEN** a bot assumption is saved with isConfirmed false and the selected probability

#### Scenario: Candidate becomes ineligible
- **WHEN** the selected issue association is deleted or loses project eligibility before persistence
- **THEN** no new suggestion is created

### Requirement: External evaluation is bounded and failures are explicit
Jev reviews SHALL impose bounded request concurrency and timeouts. Any API or response-validation failure SHALL fail that error review without creating a suggestion from partial results or falling back to legacy matching. Operational reporting SHALL distinguish no-match results from provider failures and SHALL omit credentials and raw diagnostic payloads.

#### Scenario: API failure or invalid probability
- **WHEN** a request times out, is rejected, fails, or returns a non-finite or out-of-range probability
- **THEN** the review reports a failure and creates no new suggestion even if another candidate already qualified

#### Scenario: Bulk item failure
- **WHEN** Jev fails for one error in a bulk review
- **THEN** that item is recorded as failed and the remaining items continue processing

#### Scenario: Review exceeds time budget
- **WHEN** external evaluation exceeds the overall review deadline
- **THEN** remaining work is cancelled and the review fails without persistence
