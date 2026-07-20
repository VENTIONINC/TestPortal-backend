## MODIFIED Requirements

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

### Requirement: OpenAPI documentation for skills hub
The system SHALL document the skills catalog, detail, and archive download endpoints in the generated OpenAPI specification.

#### Scenario: OpenAPI includes skills routes
- **WHEN** the OpenAPI specification is generated
- **THEN** it includes schemas and route documentation for listing skills, retrieving a single skill by ID, and downloading a complete skill package by ID as a ZIP archive.
- **AND** it identifies skill detail Markdown content as preview/source content.
- **AND** skill metadata schemas include id, source, and read-only status.

## REMOVED Requirements

### Requirement: Skill artifact download
**Reason**: A raw `SKILL.md` attachment omits bundled package resources and can produce an incomplete, non-functional skill installation.

**Migration**: Replace `GET /api/v2/skills/{id}/download` with `GET /api/v2/skills/{id}/archive`, or use the catalog-provided download URL. Use `GET /api/v2/skills/{id}` only to preview or inspect Markdown source content.

#### Scenario: Raw Markdown download endpoint is unavailable
- **WHEN** a client requests `GET /api/v2/skills/{id}/download`
- **THEN** the system does not expose a raw Markdown attachment download endpoint.
