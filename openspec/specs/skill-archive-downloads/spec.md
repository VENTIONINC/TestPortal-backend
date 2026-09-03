# skill-archive-downloads Specification

## Purpose
TBD - created by archiving change add-skill-archive-download. Update Purpose after archive.
## Requirements
### Requirement: Skill Archive Download
The system SHALL allow an authenticated client to download a persisted skill by ID as a zip archive containing the skill's `SKILL.md` and bundled resource files.

#### Scenario: Download archive for configured skill
- **WHEN** an authenticated client requests `GET /api/v2/skills/{id}/archive` for a known persisted skill ID
- **THEN** the system returns HTTP 200 with `Content-Type: application/zip`
- **AND** the response includes a `Content-Disposition` attachment filename using the skill name and `.zip` extension
- **AND** the archive contains a top-level folder named after the skill
- **AND** the top-level folder contains `SKILL.md` and bundled skill resources from that persisted skill package.

#### Scenario: Unknown skill archive
- **WHEN** an authenticated client requests `GET /api/v2/skills/{id}/archive` for an unknown skill ID
- **THEN** the system returns HTTP 404 with the existing skill-not-found error shape.

#### Scenario: Existing skill responses remain unchanged
- **WHEN** a client uses the existing skills list, skill detail, or raw Markdown download endpoints
- **THEN** the system preserves the existing response shapes and content types for those endpoints, allowing additive metadata fields.

### Requirement: Archive Path Safety
The system SHALL build skill archives only from normalized package files stored for the requested skill ID and MUST NOT allow the request path parameter or stored file paths to select arbitrary filesystem paths.

#### Scenario: Archive uses stored package files
- **WHEN** a persisted skill archive is generated
- **THEN** the system reads files only from that skill's stored package file records
- **AND** file paths inside the archive are relative to the skill package.

#### Scenario: Malicious skill name does not escape catalog
- **WHEN** a client requests an archive with an ID parameter containing path traversal characters or separators
- **THEN** the system treats the value only as an invalid or unknown skill ID
- **AND** the system does not attempt a skill-name fallback
- **AND** the system does not read files outside the persisted skills catalog.

#### Scenario: Unsafe stored paths are not archived
- **WHEN** a package file path is unsafe, absolute, empty, duplicated after normalization, or contains parent traversal
- **THEN** the system rejects that package before it can be stored or used for archive generation.
