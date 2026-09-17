## ADDED Requirements

### Requirement: Read-only best-match search
The backend SHALL provide a project-scoped operation that searches open issues for the best qualifying match to a result error without creating or changing an Assumption, Issue, or assignment.

#### Scenario: Return best qualifying issue
- **WHEN** an accessible result error has one or more qualifying open-issue matches
- **THEN** the operation returns only the highest-scoring issue suggestion and leaves persisted assignments unchanged

#### Scenario: Return no match
- **WHEN** no open issue reaches the configured threshold
- **THEN** the operation returns an explicit no-match result and performs no mutation

#### Scenario: Reject inaccessible result error
- **WHEN** the result error is outside the requested accessible project
- **THEN** the operation returns the established not-found or authorization response without searching other projects

### Requirement: Explainable similarity score
The match score SHALL be deterministic for the same stored inputs, SHALL be expressed as a value suitable for a 0–100 percent display, and SHALL compare normalized error-message text, call-stack shape, and test spec/file identity. The score SHALL represent similarity, not probability.

#### Scenario: Calculate a match
- **WHEN** a candidate issue has confirmed result errors available for comparison
- **THEN** the backend computes the candidate score from the documented three signals and returns the score for the best candidate

#### Scenario: Candidate lacks a signal
- **WHEN** message, stack, or spec identity is unavailable for either side
- **THEN** the scorer handles the absent signal deterministically without treating missing values as a perfect match

### Requirement: Suggest only assignable issues
Similarity search SHALL restrict candidates to issues in the same project that are open and have evidence from confirmed result-error associations. It SHALL include the number of other affected tests represented by the suggested issue.

#### Scenario: Exclude closed and foreign issues
- **WHEN** matching errors exist for closed issues or issues in another project
- **THEN** those issues do not participate in the returned suggestion

#### Scenario: Count affected tests
- **WHEN** a suggested issue is confirmed against multiple distinct results
- **THEN** the response reports the number of other distinct affected tests, excluding the target result

### Requirement: Stable response outcomes
The similarity operation SHALL distinguish match, no-match, validation failure, access failure, and server failure through its documented response contract so the client can map them to modal states.

#### Scenario: Search succeeds with match
- **WHEN** a match is found
- **THEN** the response includes the issue summary, score, other-affected-test count, and match outcome

#### Scenario: Search succeeds without match
- **WHEN** no candidate qualifies
- **THEN** the response includes a no-match outcome rather than an error response
