# project-category-weights Specification

## Purpose
Project category weights let clients configure how each failure category should be weighted for a project. The backend persists these weights with each project and returns a normalized five-category object in project responses so clients can render and edit the visible scoring configuration consistently.

## Requirements
### Requirement: Project category weights schema
The system SHALL represent project category weights as an object with exactly the supported failure categories: `bug`, `infra`, `performance`, `script`, and `other`.

#### Scenario: Accept valid category weights
- **WHEN** category weights are provided with all supported categories
- **THEN** each weight is accepted when it is a finite number between 0 and 100 inclusive.

#### Scenario: Reject unsupported category keys
- **WHEN** category weights include a key outside `bug`, `infra`, `performance`, `script`, and `other`
- **THEN** the system rejects the request as invalid.

#### Scenario: Reject missing category keys
- **WHEN** category weights omit any supported category
- **THEN** the system rejects the request as invalid.

#### Scenario: Reject non-numeric or out-of-range weights
- **WHEN** any category weight is not a finite number or is outside the 0 to 100 range
- **THEN** the system rejects the request as invalid.

### Requirement: Project creation category weights
The system SHALL allow clients to omit category weights when creating a project and apply the default category weights.

#### Scenario: Create project with category weights
- **WHEN** an authenticated user creates a project with a name and valid category weights
- **THEN** the system persists the provided category weights with the new project.
- **AND** the created project response includes those category weights.

#### Scenario: Create project without category weights
- **WHEN** an authenticated user creates a project without category weights
- **THEN** the system applies default weights of 100 for `bug`, `infra`, `performance`, `script`, and `other`.
- **AND** the created project response includes those default category weights.

### Requirement: Project update category weights
The system SHALL allow clients to replace a project's category weights during project update.

#### Scenario: Update project category weights
- **WHEN** a project update request includes valid category weights
- **THEN** the system persists the supplied category weights as the project's current category-weight configuration.
- **AND** the updated project response includes the supplied category weights.

#### Scenario: Update project without category weights
- **WHEN** a project update request omits category weights
- **THEN** the system leaves the existing category weights unchanged.

### Requirement: Project response category weight normalization
The system SHALL return a complete category-weight object in project responses.

#### Scenario: Return stored category weights
- **WHEN** a project has persisted category weights for supported categories
- **THEN** project list, project detail, project creation, and project update responses include those weights.

#### Scenario: Normalize legacy or missing category weights
- **WHEN** a stored project has missing, null, or malformed category weights
- **THEN** the system returns default weights of 100 for `bug`, `infra`, `performance`, `script`, and `other`.

### Requirement: Category weights API documentation
The system SHALL document project category weights in the generated OpenAPI contract.

#### Scenario: OpenAPI describes project category weights
- **WHEN** the OpenAPI specification is generated
- **THEN** project schemas include the `ProjectCategoryWeights` object with all supported categories and 0 to 100 numeric bounds.
- **AND** project creation documents `categoryWeights` as optional.
- **AND** project update documents `categoryWeights` as optional.
