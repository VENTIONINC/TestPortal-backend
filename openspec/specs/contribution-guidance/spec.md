## ADDED Requirements

### Requirement: Repository SHALL publish contributor guidance for licensing-aligned changes
The repository SHALL publish contributor guidance that explains the minimum workflow expectations for changes made under the Apache 2.0 license.

#### Scenario: Contributor looks for contribution instructions
- **WHEN** a contributor inspects the repository's contribution guidance
- **THEN** the repository SHALL describe the expected validation commands for proposed changes
- **AND** the guidance SHALL identify Apache 2.0 as the license under which contributions are accepted

### Requirement: Contributor guidance SHALL include file header workflow
The contributor guide SHALL explain when contributors are expected to use `npm run new:file` for supported new files.

#### Scenario: Contributor creates a new supported source file
- **WHEN** a contributor follows the repository contribution guide for adding a new supported source file
- **THEN** the guide SHALL instruct them to use `npm run new:file -- <path>` so the standard header is applied

### Requirement: Contributor guidance SHALL remain lightweight
The repository SHALL provide contributor guidance without introducing a CLA- or DCO-based workflow in this change.

#### Scenario: Contributor reviews contribution policy
- **WHEN** a contributor reads the contribution guide
- **THEN** the guide SHALL not require a CLA or DCO process as part of this change
- **AND** the guide SHALL still state the licensing expectations for submitted contributions
