# skill-archive-downloads Specification

## Purpose
Provide safe, complete ZIP downloads of persisted system and custom skill packages.
## Requirements
### Requirement: Skill Archive Download
The system SHALL allow an authenticated client to download a persisted skill by ID as its sole supported portable artifact: a zip archive containing the skill's `SKILL.md` and bundled resource files.

#### Scenario: Download archive for configured skill
- **WHEN** an authenticated client requests `GET /api/v2/skills/{id}/archive` for a known persisted skill ID
- **THEN** the system returns HTTP 200 with `Content-Type: application/zip`
- **AND** the response includes a `Content-Disposition` attachment filename using the skill name and `.zip` extension
- **AND** the archive contains a top-level folder named after the skill
- **AND** the top-level folder contains `SKILL.md` and bundled skill resources from that persisted skill package.

#### Scenario: Unknown skill archive
- **WHEN** an authenticated client requests `GET /api/v2/skills/{id}/archive` for an unknown skill ID
- **THEN** the system returns HTTP 404 with the existing skill-not-found error shape.

#### Scenario: Archive is the only portable download
- **WHEN** a client needs a skill artifact suitable for transfer or installation
- **THEN** the client uses `GET /api/v2/skills/{id}/archive`
- **AND** the system does not offer raw Markdown as an alternative downloadable artifact.

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

### Requirement: Custom Skill Archive Download
The system SHALL generate archive downloads for custom skill packages using the same persisted package-file behavior as system skill packages.

#### Scenario: Download archive for custom skill
- **WHEN** an authenticated client requests `GET /api/v2/skills/{id}/archive`
- **AND** `{id}` identifies a persisted custom skill
- **THEN** the system returns HTTP 200 with `Content-Type: application/zip`
- **AND** the archive contains a top-level folder named after the custom skill
- **AND** the top-level folder contains `SKILL.md` and bundled resources from that persisted custom skill package.

#### Scenario: Custom archive reflects replacement package
- **WHEN** a custom skill package has been replaced successfully
- **AND** an authenticated client requests `GET /api/v2/skills/{id}/archive` for that skill
- **THEN** the system generates the archive from the replacement package files.
