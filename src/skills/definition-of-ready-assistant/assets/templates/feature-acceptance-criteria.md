# Feature Acceptance Criteria Template

Use this template after feature readiness gaps are resolved.

## Format Rules

- Use Given/When/Then.
- Make each scenario independently verifiable.
- Avoid "should", "might", "works", "looks good", and implementation-only assertions.
- Cover happy path, important boundaries, error states, permissions, and dependencies when relevant.

```gherkin
# Scenario: [descriptive scenario name]
Given [specific precondition]
When [specific user action or system event]
Then [observable expected outcome]
And [additional observable assertion]
```

## Scenario Set

```gherkin
# Scenario: Main success path
Given [the required state]
When [the primary action occurs]
Then [the primary expected result is visible or returned]
And [the important secondary result is visible or returned]

# Scenario: Empty or initial state
Given [there is no data or setup is incomplete]
When [the user or system reaches the feature]
Then [the empty or initial behavior occurs]

# Scenario: Error or failure state
Given [the dependency or operation fails]
When [the feature handles the failure]
Then [the user-visible or system-visible failure behavior occurs]

# Scenario: Boundary condition
Given [a minimum, maximum, threshold, permission, or unusual input]
When [the feature processes it]
Then [the expected boundary behavior occurs]
```

