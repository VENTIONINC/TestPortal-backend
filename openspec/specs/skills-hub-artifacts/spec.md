# skills-hub-artifacts Specification

## Purpose
TBD - created by archiving change add-skills-hub-artifacts. Update Purpose after archive.
## Requirements
### Requirement: Authenticated skills catalog
The system SHALL provide an authenticated REST endpoint that returns the predefined skills available for client download.

#### Scenario: List available skills
- **WHEN** an authenticated user requests the skills catalog
- **THEN** the system returns a list of skill metadata entries including name, title or display label, description, category, version when available, license when available, compatibility when available, and download URL.

#### Scenario: Reject unauthenticated catalog access
- **WHEN** an unauthenticated request is made to the skills catalog endpoint
- **THEN** the system rejects the request using the existing authentication behavior for protected REST endpoints.

### Requirement: Skill detail retrieval
The system SHALL provide an authenticated REST endpoint that returns metadata and preview content for a single predefined skill.

#### Scenario: Retrieve existing skill
- **WHEN** an authenticated user requests a known skill by name
- **THEN** the system returns the skill metadata and Markdown body content for that skill.

#### Scenario: Unknown skill detail request
- **WHEN** an authenticated user requests a skill name that is not part of the predefined catalog
- **THEN** the system returns a not found response and does not attempt to read an arbitrary filesystem path.

### Requirement: Skill artifact download
The system SHALL provide an authenticated REST endpoint that downloads the canonical `SKILL.md` artifact for a predefined skill.

#### Scenario: Download existing skill artifact
- **WHEN** an authenticated user requests the download endpoint for a known skill
- **THEN** the system returns the exact Markdown artifact content with `text/markdown; charset=utf-8` content type and an attachment filename derived from the skill name.

#### Scenario: Unknown skill download request
- **WHEN** an authenticated user requests a download for a skill name that is not part of the predefined catalog
- **THEN** the system returns a not found response and does not expose filesystem details.

### Requirement: Canonical repository-owned skill artifacts
The system SHALL serve skill artifacts from a canonical repository-owned location rather than directly from user/tool-specific skill folders.

#### Scenario: Skill source is independent of tool-specific folders
- **WHEN** predefined skills are configured for the hub
- **THEN** the runtime source of truth is a backend-owned artifact location or registry, not `.codex/skills`, `.claude/skills`, or `.github/skills`.

### Requirement: OpenAPI documentation for skills hub
The system SHALL document the skills catalog, detail, and download endpoints in the generated OpenAPI specification.

#### Scenario: OpenAPI includes skills routes
- **WHEN** the OpenAPI specification is generated
- **THEN** it includes schemas and route documentation for listing skills, retrieving a single skill, and downloading a skill artifact.

