## Purpose

Provide complete deterministic Markdown for REST and MCP readers and stable source metadata for future indexing without a second authoring source.

## ADDED Requirements

### Requirement: Generated persisted document
The system SHALL derive and persist contentMd exclusively from current title, details, objective, preconditions, testData, ordered steps, expectedResult, and notes. It SHALL include every non-null authored section in a consistent order, represent empty steps explicitly, normalize document line endings to LF, and end with one newline. It SHALL preserve multiline body formatting and safely represent title text in the generated heading. Client writes to contentMd SHALL be rejected.

#### Scenario: Complete document
- **WHEN** a scenario contains all optional fields and multiple steps
- **THEN** Markdown includes title, Details, Objective, Preconditions, Test Data, Steps, Expected Result, and Notes in that order, including every step action and expected result

#### Scenario: Determinism
- **WHEN** the same structured content is rendered repeatedly at the same format version
- **THEN** the generated Markdown is byte-identical regardless of timestamps

### Requirement: Projection source metadata
Detail responses SHALL expose the persisted contentMd, contentMdHash as the lowercase SHA-256 hash of its UTF-8 bytes, and contentMdFormatVersion initially equal to 1. Content mutations SHALL update these atomically with structured content. Reads SHALL return a consistent structured/document snapshot. Renderer format changes SHALL explicitly version and rebuild affected projections.

#### Scenario: Title or step changes
- **WHEN** an edit changes text included in Markdown
- **THEN** detail returns the updated document and its matching hash with the persisted structured data

#### Scenario: Unchanged document
- **WHEN** a successful edit advances updatedAt without changing the generated document
- **THEN** the content hash remains unchanged

### Requirement: MCP representation and write boundaries
The existing MCP detail tool SHALL expose complete generated Markdown and structured scenario content alongside existing independently paginated Result and Issue evidence. The existing MCP update tool SHALL accept the same structured scenario fields and clearing semantics as REST scenario PATCH, reject contentMd and steps, and preserve shared validation. Existing list and delete behavior SHALL remain available. This change SHALL NOT introduce Markdown input, new MCP step mutation tools, or MCP creation.

#### Scenario: Read via MCP
- **WHEN** an MCP client requests scenario detail
- **THEN** it receives the complete generated document and structured scenario with existing evidence envelopes

#### Scenario: Obsolete Markdown update
- **WHEN** an MCP client submits contentMd to the update tool
- **THEN** the tool rejects the request and leaves the scenario unchanged

### Requirement: Published contracts
OpenAPI and API/MCP documentation SHALL describe structured create/edit/detail contracts, step routes, validation, generated Markdown metadata, and breaking removal of Markdown writes. List documentation SHALL retain the lightweight contract.

#### Scenario: Client contract discovery
- **WHEN** a client inspects the published API schema
- **THEN** it can distinguish editable fields from derived detail fields and discover required project context, step ordering rules, and mutation responses
