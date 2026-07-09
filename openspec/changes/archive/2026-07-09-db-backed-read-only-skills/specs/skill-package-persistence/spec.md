## ADDED Requirements

### Requirement: Persisted Skill Packages
The system SHALL store skill package metadata and normalized package files in the database.

#### Scenario: Store package metadata and files
- **WHEN** a skill package is persisted
- **THEN** the system stores the skill name, title, description, category, optional version, optional license, optional compatibility, source, read-only status, and package hash
- **AND** the system stores each package file with a normalized relative path, content, content type, and size.

#### Scenario: Skill names are globally unique
- **WHEN** a skill package is persisted with a name that already exists
- **THEN** the system rejects the duplicate name instead of creating a second package with the same name.

### Requirement: Seed Existing Skills
The system SHALL seed existing repository skill artifacts into the persisted skill package store as read-only system skills.

#### Scenario: Seed canonical repository skills
- **WHEN** the seed workflow imports the current canonical skills from `src/skills`
- **THEN** each imported skill is stored as a package with `source` set to `system`
- **AND** each imported skill is stored with read-only status enabled
- **AND** bundled resources under the skill folder are stored as package files.

#### Scenario: Seed workflow is idempotent
- **WHEN** the seed workflow is run more than once for the same canonical skill
- **THEN** the system updates the existing persisted system package instead of creating a duplicate record.

### Requirement: Package Validation Before Persistence
The system SHALL validate skill package structure before storing package metadata or package files.

#### Scenario: Valid package is accepted
- **WHEN** a package contains a valid `SKILL.md` file with required frontmatter and safe bundled resource paths
- **THEN** the system allows the package to be persisted.

#### Scenario: Invalid package is rejected
- **WHEN** a package is missing `SKILL.md`, has malformed required frontmatter, has duplicate normalized paths, exceeds configured package limits, or contains unsafe paths
- **THEN** the system rejects the package and does not persist partial package files.

#### Scenario: Unsafe paths are rejected
- **WHEN** a package file path is absolute, empty, contains parent traversal, or normalizes outside the package root
- **THEN** the system rejects the package before storage.
