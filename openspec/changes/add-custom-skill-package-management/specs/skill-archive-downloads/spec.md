## ADDED Requirements

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
