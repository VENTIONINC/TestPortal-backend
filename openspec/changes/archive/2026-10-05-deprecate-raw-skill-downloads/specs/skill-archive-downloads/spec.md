## MODIFIED Requirements

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
