# Feature Readiness Criteria

Use these criteria for features, stories, improvements, refactors with user-facing behavior, and unknown ticket types.

## 1. Scope Clarity

Check whether the ticket has one clear objective, explicit in-scope and out-of-scope boundaries, and no vague verbs such as "improve", "enhance", "clean up", or "make better" without concrete behavior.

- Pass: One objective, clear boundaries, no ambiguous scope.
- Partial: Objective is understandable but scope edges are fuzzy.
- Fail: Multiple objectives or unclear core task.
- Questions: What is the single deliverable? What is explicitly out of scope? What should the agent do if it can only do one thing?

## 2. Acceptance Criteria

Check whether success criteria exist and can be verified by tests, review, or manual QA.

- Pass: Criteria are specific, observable, and testable.
- Partial: Criteria exist but include vague expectations.
- Fail: No acceptance criteria.
- Questions: What does success look like? What condition triggers the behavior? What exact result is expected?

## 3. User or Visual Context

Check whether the expected user experience, UI state, API behavior, or workflow is described enough to avoid guessing.

- Pass: Design/reference is linked or behavior is fully described.
- Partial: Reference exists but is incomplete or stale.
- Fail: UI/workflow behavior is requested but no usable context exists.
- Questions: What reference should be followed? What states must be covered? If no design exists, what should the layout or behavior be?

## 4. Technical References

Check whether likely components, modules, endpoints, schemas, data models, or related examples are named.

- Pass: Relevant technical anchors are explicit.
- Partial: General area is named but exact anchors are missing.
- Fail: No technical context where context is reasonably expected.
- Questions: Which components or services are involved? Which endpoints or schemas matter? Is there similar existing work?

## 5. Edge Cases

Check whether non-happy paths are covered: loading, empty, error, permission, boundary, long text, invalid input, concurrency, and data-volume cases.

- Pass: Important edge cases are listed.
- Partial: One or two are mentioned but obvious cases are missing.
- Fail: Only happy path is described.
- Questions: What happens when data is empty? What happens on error? Are roles, limits, or permissions relevant?

## 6. Dependencies

Check whether blocking tickets, APIs, designs, migrations, feature flags, approvals, or release order dependencies are named and their status is clear.

- Pass: No blockers, or blockers are explicit with status.
- Partial: Dependencies are implied but not specific.
- Fail: Likely blockers exist but are not identified.
- Questions: What must be merged or decided first? Are feature flags or migrations required? Is another team involved?

## 7. Definition of Done

Check whether the completion standard is explicit beyond "it works".

- Pass: Verification, tests, review, documentation, analytics, or operational requirements are stated.
- Partial: Some verification is implied but incomplete.
- Fail: No Definition of Done.
- Questions: What tests are expected? Who signs off? Are docs, analytics, or release notes required?

## 8. Ambiguity Index

Scan for ambiguity markers: "should", "might", "probably", "ideally", "as needed", "TBD", "TODO", "same as existing", "standard behavior", "ask later", and unresolved placeholders.

- Pass: No blocking ambiguities.
- Partial: A few ambiguities that can be resolved quickly.
- Fail: Critical ambiguity or many unresolved placeholders.
- Questions: Is this required or optional? What exact existing behavior should be copied? What is the concrete answer for the placeholder?

