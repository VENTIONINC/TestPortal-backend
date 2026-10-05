# skills-hub-artifacts Specification

## Purpose
Provide authenticated skill catalog, preview, package management, and complete ZIP artifact download APIs.
## Requirements
### Requirement: Authenticated skills catalog
The system SHALL provide an authenticated REST endpoint that returns the persisted skills available for client download, including seeded read-only system skills and their persisted IDs.

#### Scenario: List available skills
- **WHEN** an authenticated user requests the skills catalog
- **THEN** the system returns a list of skill metadata entries including id, name, title or display label, description, category, version when available, license when available, compatibility when available, source, read-only status, and download URL.
- **AND** the download URL uses the persisted skill ID rather than the skill name.
- **AND** the download URL targets `GET /api/v2/skills/{id}/archive` and represents the complete installable ZIP package.

#### Scenario: Reject unauthenticated catalog access
- **WHEN** an unauthenticated request is made to the skills catalog
- **THEN** the system rejects the request using the existing authentication behavior for protected REST endpoints.

### Requirement: Skill detail retrieval
The system SHALL provide an authenticated REST endpoint that returns metadata and preview content for a single persisted skill by ID.

#### Scenario: Retrieve existing skill
- **WHEN** an authenticated user requests `GET /api/v2/skills/{id}` for a known persisted skill ID
- **THEN** the system returns the skill metadata and Markdown body content for that skill.
- **AND** the Markdown body is documented as preview/source content rather than a complete installable artifact.

#### Scenario: Unknown skill detail request
- **WHEN** an authenticated user requests a skill ID that is not part of the persisted skills catalog
- **THEN** the system returns a not found response and does not attempt a skill-name fallback.

### Requirement: Canonical repository-owned skill artifacts
The system SHALL use seeded database package records as the runtime source of truth for canonical repository-owned skill artifacts.

#### Scenario: Skill source is independent of tool-specific folders
- **WHEN** predefined skills are configured for the hub
- **THEN** the seed source is a backend-owned artifact location or registry, not `.codex/skills`, `.claude/skills`, or `.github/skills`
- **AND** runtime API responses are served from persisted skill package records.

### Requirement: OpenAPI documentation for skills hub
The system SHALL document the skills catalog, detail, and archive download endpoints in the generated OpenAPI specification.

#### Scenario: OpenAPI includes skills routes
- **WHEN** the OpenAPI specification is generated
- **THEN** it includes schemas and route documentation for listing skills, retrieving a single skill by ID, and downloading a complete skill package by ID as a ZIP archive.
- **AND** it identifies skill detail Markdown content as preview/source content.
- **AND** skill metadata schemas include id, source, and read-only status.

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
- **AND** subsequent detail and archive download responses use the replacement package.

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
