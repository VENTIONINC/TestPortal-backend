## Purpose

Enable independently validated Test Scenario fields while preserving project context, lightweight summaries, and execution evidence relationships.

## ADDED Requirements

### Requirement: Structured scenario creation
The system SHALL accept projectId, required nonblank title, optional details, objective, preconditions, testData, expectedResult, notes, and optional initial ordered steps. Supplied text SHALL be trimmed and nonblank; optional text SHALL default to null and steps to an empty array. Each step SHALL require an action and accept optional expectedResult. Creation SHALL derive creator identity from authenticated context, generate step IDs, and reject client-supplied Markdown, projection metadata, step IDs, and positions. Success SHALL return 201 with complete scenario detail.

#### Scenario: Minimal creation
- **WHEN** an authenticated client creates a scenario with a valid projectId and title only
- **THEN** the scenario has null optional fields, no steps, and generated Markdown

#### Scenario: Atomic initial steps
- **WHEN** a client creates a scenario with multiple valid steps
- **THEN** all steps are persisted in input order with distinct stable IDs in the same operation

#### Scenario: Invalid content
- **WHEN** a creation contains a blank action, null optional text, unknown field, or contentMd
- **THEN** the request returns 400 and no scenario or steps are created

### Requirement: Partial scenario field editing
Scenario PATCH SHALL accept at least one of title, details, objective, preconditions, testData, expectedResult, and notes. Omitted fields SHALL remain unchanged; null SHALL clear optional text. Title SHALL remain nonblank and non-null. Steps and derived or immutable fields SHALL be rejected. Success SHALL return 200 with complete detail while preserving creator, project, creation timestamp, and evidence links.

#### Scenario: Clear one field
- **WHEN** a PATCH supplies only notes as null
- **THEN** notes is cleared and all other authored fields and steps are preserved

#### Scenario: Unsupported or empty update
- **WHEN** PATCH contains no editable fields or supplies steps or contentMd
- **THEN** the system returns 400 without changing the scenario

### Requirement: Preserve summary and project contracts
REST and MCP list responses SHALL retain existing summary fields, safe creator projection, pagination, and ordering and SHALL neither load nor return full content, projection metadata, or steps. Detail SHALL expose structured fields, ordered steps, and generated Markdown metadata. Existing project-context predicates and evidence relationships SHALL be preserved; invalid project context SHALL return the established not-found behavior.

#### Scenario: Lightweight list
- **WHEN** a scenario contains many long steps
- **THEN** listing scenarios returns only the existing summary representation without fetching the body or steps

#### Scenario: Wrong project
- **WHEN** a detail or mutation targets a scenario through a different projectId
- **THEN** the system returns 404 and leaves content and links unchanged

### Requirement: Scoped development data reset
The migration SHALL discard preexisting scenarios and their scenario-to-Spec links as authorized for development, while preserving projects, users, Specs, Results, Issues, and other unrelated records. It SHALL support both populated old-schema and empty databases.

#### Scenario: Existing linked scenario
- **WHEN** migration runs against old scenario data linked to Specs with execution evidence
- **THEN** scenarios and scenario links are removed while the linked Specs and their Results and Issues remain
