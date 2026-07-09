## MODIFIED Requirements

### Requirement: Authenticated skills catalog
The system SHALL provide an authenticated REST endpoint that returns the persisted skills available for client download, including seeded read-only system skills and their persisted IDs.

#### Scenario: List available skills
- **WHEN** an authenticated user requests the skills catalog
- **THEN** the system returns a list of skill metadata entries including id, name, title or display label, description, category, version when available, license when available, compatibility when available, source, read-only status, and download URL.
- **AND** the download URL uses the persisted skill ID rather than the skill name.

#### Scenario: Reject unauthenticated catalog access
- **WHEN** an unauthenticated request is made to the skills catalog endpoint
- **THEN** the system rejects the request using the existing authentication behavior for protected REST endpoints.

### Requirement: Skill detail retrieval
The system SHALL provide an authenticated REST endpoint that returns metadata and preview content for a single persisted skill by ID.

#### Scenario: Retrieve existing skill
- **WHEN** an authenticated user requests `GET /api/v2/skills/{id}` for a known persisted skill ID
- **THEN** the system returns the skill metadata and Markdown body content for that skill.

#### Scenario: Unknown skill detail request
- **WHEN** an authenticated user requests a skill ID that is not part of the persisted skills catalog
- **THEN** the system returns a not found response and does not attempt a skill-name fallback.

### Requirement: Skill artifact download
The system SHALL provide an authenticated REST endpoint that downloads the persisted `SKILL.md` artifact for a known skill by ID.

#### Scenario: Download existing skill artifact
- **WHEN** an authenticated user requests `GET /api/v2/skills/{id}/download` for a known persisted skill ID
- **THEN** the system returns the exact stored Markdown artifact content with `text/markdown; charset=utf-8` content type and an attachment filename derived from the skill name.

#### Scenario: Unknown skill download request
- **WHEN** an authenticated user requests a download for a skill ID that is not part of the persisted skills catalog
- **THEN** the system returns a not found response and does not attempt a skill-name fallback.

### Requirement: Canonical repository-owned skill artifacts
The system SHALL use seeded database package records as the runtime source of truth for canonical repository-owned skill artifacts.

#### Scenario: Skill source is independent of tool-specific folders
- **WHEN** predefined skills are configured for the hub
- **THEN** the seed source is a backend-owned artifact location or registry, not `.codex/skills`, `.claude/skills`, or `.github/skills`
- **AND** runtime API responses are served from persisted skill package records.

### Requirement: OpenAPI documentation for skills hub
The system SHALL document the skills catalog, detail, and download endpoints in the generated OpenAPI specification.

#### Scenario: OpenAPI includes skills routes
- **WHEN** the OpenAPI specification is generated
- **THEN** it includes schemas and route documentation for listing skills, retrieving a single skill by ID, and downloading a skill artifact by ID
- **AND** skill metadata schemas include id, source, and read-only status.
