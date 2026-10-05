## ADDED Requirements

### Requirement: Uploaded Package Extraction
The system SHALL extract uploaded custom skill zip packages into normalized package files before persistence and MUST NOT persist the original zip as the runtime package source.

#### Scenario: Extract valid uploaded package
- **WHEN** an authenticated client uploads a valid skill package zip
- **THEN** the system extracts supported package files from the zip
- **AND** the system normalizes package file paths before validation
- **AND** the system stores the normalized package files as persisted package file records.

#### Scenario: Ignore transport-level package name
- **WHEN** an authenticated client uploads a valid skill package zip
- **THEN** the system uses the `SKILL.md` frontmatter name as the skill name
- **AND** the system does not use the zip filename or top-level directory name as the persisted skill name.

#### Scenario: Reject unsafe skill name
- **WHEN** an uploaded package contains a `SKILL.md` frontmatter name that is not a bounded lowercase slug
- **THEN** the system rejects the package before persistence
- **AND** the unsafe name cannot be used in generated archive paths or download filenames.

#### Scenario: Reject unsafe uploaded zip entries
- **WHEN** an uploaded zip contains absolute paths, empty paths, parent traversal, duplicate normalized paths, unsupported file types, excessive file count, excessive file size, or excessive total uncompressed size
- **THEN** the system rejects the package before persistence.

### Requirement: Custom Package Persistence
The system SHALL persist valid uploaded packages as shared custom skill packages.

#### Scenario: Persist custom package metadata and files
- **WHEN** a valid custom package is created
- **THEN** the system stores the skill name, title, description, category, optional version, optional license, optional compatibility, source, read-only status, package hash, and package files
- **AND** the persisted source is `custom`
- **AND** the persisted read-only status is disabled.

#### Scenario: Reject global name conflict
- **WHEN** a custom package is created or replaced with a skill name that belongs to another persisted skill
- **THEN** the system rejects the write with a conflict error
- **AND** the system does not persist partial package changes.

#### Scenario: Replace custom package transactionally
- **WHEN** an existing custom skill package is replaced with a valid package
- **THEN** the system updates package metadata and replaces package file records in one transaction
- **AND** failed replacement does not leave partial metadata or package-file changes.

#### Scenario: Delete custom package files with skill
- **WHEN** an existing custom skill is deleted
- **THEN** the system deletes the skill package metadata
- **AND** the system deletes associated package file records.

### Requirement: Read-Only System Package Protection
The system SHALL prevent write operations from mutating seeded read-only system skill packages.

#### Scenario: System package cannot be replaced
- **WHEN** a client attempts to replace a package for a skill with read-only status enabled
- **THEN** the system rejects the write
- **AND** the system leaves the system package metadata and files unchanged.

#### Scenario: System package cannot be deleted
- **WHEN** a client attempts to delete a skill with read-only status enabled
- **THEN** the system rejects the delete
- **AND** the system leaves the system package metadata and files unchanged.
