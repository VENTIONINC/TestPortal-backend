## ADDED Requirements

### Requirement: Repository SHALL provide a headered file creation command
The repository SHALL provide an npm command named `new:file` that creates a new file at a caller-supplied path for supported file types.

#### Scenario: Command is invoked with a valid new path
- **WHEN** a developer runs `npm run new:file -- <path>` with a supported file path that does not already exist
- **THEN** the command SHALL create any missing parent directories
- **AND** the command SHALL create the target file at the requested path

#### Scenario: Command is invoked without a path
- **WHEN** a developer runs `npm run new:file` without providing a target path
- **THEN** the command SHALL fail with a clear usage error
- **AND** the command SHALL not create any files

#### Scenario: Command targets an existing file
- **WHEN** a developer runs `npm run new:file -- <path>` and the target file already exists
- **THEN** the command SHALL fail without overwriting the existing file

### Requirement: Command SHALL prepend the Apache 2.0 source header for supported file types
For supported source file extensions, the `new:file` command SHALL prepend the standard repository header before any additional file content.

#### Scenario: TypeScript-family file is created
- **WHEN** a developer creates a supported TypeScript or JavaScript-family file with `npm run new:file -- <path>`
- **THEN** the new file SHALL begin with `Copyright 2026 Vention`
- **AND** the new file SHALL include the SPDX identifier `Apache-2.0` in the file header

### Requirement: Supported file behavior SHALL be documented
The repository SHALL document which file extensions are supported by `npm run new:file` and how unsupported extensions are handled.

#### Scenario: Contributor reads file creation guidance
- **WHEN** a contributor reviews the documented workflow for creating files
- **THEN** the documentation SHALL explain how to invoke `npm run new:file`
- **AND** the documentation SHALL identify the supported file types or extension rules

### Requirement: Repository SHALL provide a bulk header backfill command
The repository SHALL provide a command that scans the project for supported source files and prepends the standard Apache 2.0 header when it is missing.

#### Scenario: Bulk backfill is run
- **WHEN** a developer runs the repository bulk header command
- **THEN** the command SHALL scan supported source files in the project
- **AND** the command SHALL add the standard header only to supported files that do not already contain it
- **AND** the command SHALL leave already-headered supported files unchanged
