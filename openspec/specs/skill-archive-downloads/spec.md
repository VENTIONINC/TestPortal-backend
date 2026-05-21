# skill-archive-downloads Specification

## Purpose
TBD - created by archiving change add-skill-archive-download. Update Purpose after archive.
## Requirements
### Requirement: Skill Archive Download
The system SHALL allow an authenticated client to download a configured skill as a zip archive containing the skill's `SKILL.md` and bundled resource files.

#### Scenario: Download archive for configured skill
- **WHEN** an authenticated client requests `GET /api/v2/skills/{name}/archive` for a configured skill
- **THEN** the system returns HTTP 200 with `Content-Type: application/zip`
- **AND** the response includes a `Content-Disposition` attachment filename using the skill name and `.zip` extension
- **AND** the archive contains a top-level folder named after the skill
- **AND** the top-level folder contains `SKILL.md` and bundled skill resources from that configured skill directory

#### Scenario: Unknown skill archive
- **WHEN** an authenticated client requests `GET /api/v2/skills/{name}/archive` for an unknown skill name
- **THEN** the system returns HTTP 404 with the existing skill-not-found error shape

#### Scenario: Existing skill responses remain unchanged
- **WHEN** a client uses the existing skills list, skill detail, or raw Markdown download endpoints
- **THEN** the system preserves the existing response shapes and content types for those endpoints

### Requirement: Archive Path Safety
The system SHALL build skill archives only from configured skill directories and MUST NOT allow the request path parameter to select arbitrary filesystem paths.

#### Scenario: Archive uses configured path
- **WHEN** a configured skill archive is generated
- **THEN** the system reads files only from that skill's configured directory
- **AND** file paths inside the archive are relative to the skill folder

#### Scenario: Malicious skill name does not escape catalog
- **WHEN** a client requests an archive with a name containing path traversal characters or separators
- **THEN** the system treats the value as a skill name lookup
- **AND** the system does not read files outside the configured skills catalog

