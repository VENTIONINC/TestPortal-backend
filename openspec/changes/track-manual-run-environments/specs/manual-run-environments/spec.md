# Spec Delta

## Purpose

Records the environment of manual test executions and lets project users reuse project-specific settings without changing historical run data.

## ADDED Requirements

### Requirement: Shared project profiles
The system SHALL let an authenticated user create, list, update, and delete environment profiles within a project. Profiles SHALL be shared by project users and scoped to the project. Each profile SHALL have a nonblank name and optional browser, operating system, device, and API environment values.

#### Scenario: Create and list shared profile
- **WHEN** a user creates a profile for an accessible project and lists its profiles
- **THEN** the new profile is returned in the project's profile list to every user operating in that project

#### Scenario: Project isolation
- **WHEN** a user requests, changes, or deletes a profile belonging to another project
- **THEN** the system does not disclose or modify that profile

#### Scenario: Project access
- **WHEN** a user requests profile operations for a project they cannot access
- **THEN** the system rejects the operation without disclosing profile data

### Requirement: Optional run environment
The system SHALL accept an optional profile reference and any subset of browser, operating system, device, API environment, build, and deployment values when starting a manual test run. No environment input SHALL be required.

#### Scenario: Start without environment
- **WHEN** a user starts a run without a profile or environment values
- **THEN** the run is created with empty environment fields

#### Scenario: Start with direct values
- **WHEN** a user starts a run with a subset of environment values and no profile
- **THEN** those values are saved and omitted fields remain empty

#### Scenario: Start with profile and overrides
- **WHEN** a user starts a run with a profile from the same project and explicitly supplies environment field values
- **THEN** the reusable fields omitted from the request come from the profile, explicitly supplied values take precedence, and build and deployment come only from the request

#### Scenario: Reject invalid profile reference
- **WHEN** a start request references a missing profile or a profile outside the requested project
- **THEN** the system rejects the request and creates no run

### Requirement: Independent run snapshot
The system SHALL store the resolved environment values on the run independently of the profile and SHALL expose them in run detail and history responses.

#### Scenario: Profile changes later
- **WHEN** a profile used for a run is updated or deleted
- **THEN** the run's saved environment values and history response remain unchanged

#### Scenario: Existing run
- **WHEN** an older run without recorded environment is retrieved
- **THEN** detail and history responses represent its environment fields as empty values

#### Scenario: Run update
- **WHEN** a user updates a run after it starts
- **THEN** the saved environment snapshot is not editable through run update operations
