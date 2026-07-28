## ADDED Requirements

### Requirement: Custom Skill Creation
The system SHALL allow authenticated clients to create shared custom skills by uploading valid skill package zip files through the existing skills API.

#### Scenario: Create custom skill package
- **WHEN** an authenticated client uploads a valid skill package zip to `POST /api/v2/skills`
- **AND** the multipart request includes non-empty `title` and `category` fields
- **THEN** the system returns HTTP 201 with the persisted skill metadata
- **AND** the persisted skill has `source` set to `custom`
- **AND** the persisted skill has read-only status disabled
- **AND** the skill appears in subsequent `GET /api/v2/skills` responses.

#### Scenario: Reject unauthenticated custom skill creation
- **WHEN** an unauthenticated client uploads a skill package zip to `POST /api/v2/skills`
- **THEN** the system rejects the request using the existing authentication behavior for protected REST endpoints.

#### Scenario: Reject invalid custom skill package upload
- **WHEN** an authenticated client uploads a missing, non-zip, malformed, unsafe, or invalid skill package to `POST /api/v2/skills`
- **THEN** the system returns HTTP 400
- **AND** the system does not persist a partial skill package.

#### Scenario: Reject duplicate custom skill name
- **WHEN** an authenticated client uploads a valid skill package whose `SKILL.md` frontmatter name already exists in the persisted skills catalog
- **THEN** the system returns HTTP 409 Conflict
- **AND** the system does not overwrite the existing skill.

### Requirement: Custom Skill Replacement
The system SHALL allow authenticated clients to replace the package content for existing custom skills while preserving the skill ID.

#### Scenario: Replace custom skill package
- **WHEN** an authenticated client uploads a valid replacement skill package zip to `PUT /api/v2/skills/{id}`
- **AND** the multipart request includes non-empty `title` and `category` fields
- **AND** `{id}` identifies an existing custom skill
- **THEN** the system replaces that skill's package metadata and package files transactionally
- **AND** the system preserves the skill ID
- **AND** subsequent detail, Markdown download, and archive download responses use the replacement package.

#### Scenario: Reject replacement for unknown skill
- **WHEN** an authenticated client uploads a valid replacement skill package zip to `PUT /api/v2/skills/{id}`
- **AND** `{id}` does not identify an existing persisted skill
- **THEN** the system returns HTTP 404.

#### Scenario: Reject replacement of read-only system skill
- **WHEN** an authenticated client uploads a valid replacement skill package zip to `PUT /api/v2/skills/{id}`
- **AND** `{id}` identifies a read-only system skill
- **THEN** the system returns HTTP 403 Forbidden
- **AND** the system does not modify the system skill.

#### Scenario: Reject replacement name conflict
- **WHEN** an authenticated client uploads a valid replacement package whose `SKILL.md` frontmatter name matches a different persisted skill
- **THEN** the system returns HTTP 409 Conflict
- **AND** the system leaves the existing custom skill unchanged.

### Requirement: Custom Skill Deletion
The system SHALL allow authenticated clients to delete custom skills and SHALL reject deletion of read-only system skills.

#### Scenario: Delete custom skill
- **WHEN** an authenticated client requests `DELETE /api/v2/skills/{id}`
- **AND** `{id}` identifies an existing custom skill
- **THEN** the system deletes the skill and its package files
- **AND** the system returns HTTP 204
- **AND** the skill no longer appears in subsequent skills catalog responses.

#### Scenario: Reject deletion for unknown skill
- **WHEN** an authenticated client requests `DELETE /api/v2/skills/{id}`
- **AND** `{id}` does not identify an existing persisted skill
- **THEN** the system returns HTTP 404.

#### Scenario: Reject deletion of read-only system skill
- **WHEN** an authenticated client requests `DELETE /api/v2/skills/{id}`
- **AND** `{id}` identifies a read-only system skill
- **THEN** the system returns HTTP 403 Forbidden
- **AND** the system does not delete the system skill.
