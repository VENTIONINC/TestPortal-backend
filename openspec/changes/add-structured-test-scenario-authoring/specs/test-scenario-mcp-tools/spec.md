## MODIFIED Requirements

### Requirement: MCP clients can retrieve full scenario detail with execution evidence
The system SHALL expose a `get-test-scenario` MCP tool requiring valid `scenarioId` and `projectId` inputs. The tool SHALL return a `scenario` containing the complete persisted Test Scenario including structured fields, ordered steps, generated `contentMd`, its hash, and format version, a `resultEvidence` envelope produced from Results belonging to linked same-project Specs, and an `issueEvidence` envelope produced from observed Issues derived through those Results. Result and Issue evidence SHALL be independently paginated through optional `resultPage`, `resultLimit`, `issuePage`, and `issueLimit` inputs using the established evidence pagination rules.

#### Scenario: Retrieve a scenario with linked evidence
- **WHEN** the client retrieves a scenario linked to Specs that have Results and observed Issues in the requested project
- **THEN** the tool returns the complete scenario with its complete persisted generated Markdown
- **AND** `resultEvidence` contains the established Result evidence envelope
- **AND** `issueEvidence` contains the established deduplicated observed-Issue evidence envelope

#### Scenario: Retrieve an unlinked scenario
- **WHEN** the client retrieves an existing scenario with no linked Specs
- **THEN** the tool returns the complete scenario
- **AND** both evidence envelopes report `linkedSpecCount` as 0 with empty collections and zero totals

#### Scenario: Evidence pages are independent
- **WHEN** the client supplies different valid Result and Issue page or limit values
- **THEN** each evidence envelope reflects its own requested page and limit
- **AND** neither evidence pagination input changes the other evidence collection

#### Scenario: Scenario is outside the requested project
- **WHEN** the scenario is absent or belongs to a different project than `projectId`
- **THEN** the tool returns an MCP error without scenario, Markdown, Result, or Issue data

### Requirement: MCP clients can partially update a project-scoped Test Scenario
The system SHALL expose update-test-scenario requiring scenarioId and projectId plus at least one allowed structured scenario field. It SHALL reuse REST scenario PATCH validation, trimming, nullable clearing, omitted-field preservation, generated Markdown persistence, serialized last-write-wins behavior, immutable metadata, and project scoping. Success SHALL return complete persisted detail. Inputs SHALL reject contentMd, projection metadata, and steps.

#### Scenario: Update title or optional fields
- **WHEN** an MCP client supplies a valid title or optional structured scenario fields
- **THEN** supplied fields are updated, omitted fields and steps are preserved, and the returned generated Markdown matches the structured content

#### Scenario: Clear optional text
- **WHEN** notes is supplied as null
- **THEN** notes is cleared and the Markdown is regenerated atomically

#### Scenario: Invalid input
- **WHEN** the client supplies no editable field, invalid text, contentMd, steps, or unsupported fields
- **THEN** the tool returns an MCP error without mutation

#### Scenario: Wrong project
- **WHEN** scenarioId belongs to a different project
- **THEN** the tool returns an MCP error and preserves the scenario and all evidence links

#### Scenario: Update only the title
- **WHEN** a client supplies only a valid title
- **THEN** the title is trimmed and updated, omitted structured fields are preserved, and Markdown is regenerated

#### Scenario: Update only the Markdown
- **WHEN** an MCP client submits contentMd
- **THEN** the tool returns an MCP error without mutation

#### Scenario: Invalid update is rejected
- **WHEN** an MCP update has no editable fields or includes invalid or read-only fields
- **THEN** the tool returns an MCP error without mutation

#### Scenario: Cross-project update is rejected
- **WHEN** an MCP update targets a scenario through another project
- **THEN** the tool returns an MCP error and preserves scenario and evidence data
