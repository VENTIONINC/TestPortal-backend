## ADDED Requirements

### Requirement: Conformant single-source namespaced CTRF diagnostics
The CLI SHALL emit CTRF documents conforming to the pinned supported CTRF schema and SHALL place TestPortal-specific diagnostic extension data under a versioned `testPortal` namespace within a schema-permitted `extra` object. `extra.testPortal.errors` is authoritative for `rawLogs` and `sourceSnippet`; these fields MUST NOT be duplicated into `tests[]` or retry-attempt standard fields.

#### Scenario: Enriched Playwright report is serialized
- **WHEN** normalized Playwright errors contain raw logs, source snippets, or generated test cases
- **THEN** the emitted CTRF contains sufficient namespaced extension data to reconstruct those values and validates against the pinned CTRF schema

#### Scenario: Report has no enrichment
- **WHEN** normalized errors contain none of the optional diagnostic fields
- **THEN** the emitted CTRF remains valid without requiring an empty TestPortal extension

#### Scenario: Unrelated CTRF consumer reads the report
- **WHEN** a consumer does not understand the `testPortal` namespace
- **THEN** it can ignore the extension while processing the standard CTRF fields

### Requirement: Per-error diagnostic association
The TestPortal CTRF extension SHALL preserve ordered error identity and SHALL associate diagnostic fields with the error to which they belong.

#### Scenario: One test attempt has multiple errors
- **WHEN** a normalized attempt contains multiple errors with different diagnostics
- **THEN** serialization and import preserve the number, order, and diagnostic association of those errors

#### Scenario: Attempt-level enrichment has no explicit error identity
- **WHEN** Playwright provides attempt-level diagnostic enrichment for a failed attempt with one or more errors
- **THEN** the canonical mapping rule associates that enrichment deterministically and identically in direct and CTRF-mediated imports

### Requirement: Provider-neutral CTRF diagnostic import
The backend CTRF importer SHALL parse supported TestPortal extension versions without branching on the source tool name and SHALL persist valid diagnostic fields on the corresponding `ResultError` records.

#### Scenario: Supported namespaced extension is imported
- **WHEN** a CTRF test contains a supported `extra.testPortal` diagnostic extension
- **THEN** the importer validates and persists its recognised error diagnostics without requiring the CTRF tool to be Playwright

#### Scenario: Extension is partially populated
- **WHEN** a supported extension contains only some diagnostic fields
- **THEN** every valid supplied field is persisted and absent fields remain absent

#### Scenario: Extension contains malformed or unknown data
- **WHEN** an extension contains invalid fields, unknown keys, or an unsupported version
- **THEN** the importer safely ignores unsupported data according to the documented compatibility policy and continues importing standard CTRF content

### Requirement: Legacy CTRF compatibility
The backend SHALL continue importing existing TestPortal CTRF documents that omit namespaced diagnostic extensions or use the previously accepted test-level `meta` fields.

#### Scenario: Old CTRF has no diagnostic metadata
- **WHEN** an existing CTRF document contains no diagnostic extension
- **THEN** import succeeds with the same result semantics and nullable diagnostic fields remain absent

#### Scenario: Old CTRF uses canonical legacy meta keys
- **WHEN** an existing CTRF test contains valid `meta.logs`, `meta.sourceSnippet`, or `meta.generatedTestCase`
- **THEN** import continues to populate the corresponding `ResultError` fields during the compatibility period

### Requirement: Direct and CTRF import equivalence
For the same supported Playwright report, direct Playwright import and CLI conversion followed by CTRF import SHALL produce semantically equivalent persisted error diagnostics.

#### Scenario: All diagnostic fields are present
- **WHEN** the same Playwright fixture containing raw logs, a source snippet, and a generated test case is imported through both paths
- **THEN** corresponding `ResultError.rawLogs`, `sourceSnippet`, and `generatedTestCase` values are equivalent

#### Scenario: Optional fields are independently absent
- **WHEN** fixtures omit each optional diagnostic field individually
- **THEN** both paths agree on the presence and value of every diagnostic field

#### Scenario: Multiple errors are present
- **WHEN** one Playwright attempt contains multiple errors
- **THEN** both paths persist equivalent ordered errors and equivalent diagnostics for each corresponding error

### Requirement: CTRF contract alignment
Backend TypeScript types, runtime validators, OpenAPI schemas, MCP schemas, and CLI CTRF types SHALL describe the supported CTRF core and diagnostic extension consistently.

#### Scenario: Contracts are verified
- **WHEN** the affected packages run type checking, schema validation tests, and contract tests
- **THEN** generated CTRF output and accepted input agree on required core fields, extension location, version, and optional diagnostic shapes

