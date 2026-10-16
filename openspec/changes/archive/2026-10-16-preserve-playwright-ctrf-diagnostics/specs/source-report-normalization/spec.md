## ADDED Requirements

### Requirement: Registry-selected source mapper
The CLI SHALL select a source-specific mapper through its provider registry and SHALL pass the mapper's normalized output to provider-independent CTRF serialization.

#### Scenario: Playwright report type is selected
- **WHEN** a user converts a valid report with `-t playwright`
- **THEN** the registered Playwright mapper normalizes the report before the common CTRF serializer runs

#### Scenario: Another registered report type is selected
- **WHEN** a user converts a valid report for any other registered provider
- **THEN** the registry selects that provider without requiring Playwright-specific branching in the serializer

#### Scenario: Unknown report type is selected
- **WHEN** a user requests a report type that is not registered
- **THEN** conversion fails using the CLI's established unsupported-provider behavior

### Requirement: Error-aware normalized representation
The normalized report model SHALL represent execution attempts and their ordered errors, and SHALL allow each error to carry optional raw logs, source snippet metadata, and generated test case content.

#### Scenario: Attempt contains one enriched error
- **WHEN** a source mapper receives one failed attempt with diagnostic enrichment
- **THEN** it emits one normalized error with the enrichment associated with that error

#### Scenario: Attempt contains multiple errors
- **WHEN** a source report contains multiple ordered errors for one execution attempt
- **THEN** the normalized output preserves each error and its diagnostic association without silently retaining only the first error

#### Scenario: Diagnostic enrichment is absent
- **WHEN** a source error has no supported diagnostic enrichment
- **THEN** the mapper emits the error without fabricating or requiring diagnostic fields

### Requirement: Canonical Playwright diagnostic extraction
The Playwright mapper and direct Playwright ingestion path SHALL follow one canonical interpretation of Playwright output, snippets, generated test cases, attempts, and errors.

#### Scenario: Native Playwright output is present
- **WHEN** a Playwright attempt does not provide canonical logs but contains `stdout` and `stderr` entries
- **THEN** canonical extraction produces the same ordered raw-log values for direct import and CLI conversion

#### Scenario: Native Playwright error snippet is present
- **WHEN** a Playwright error contains a snippet and valid source location
- **THEN** canonical extraction produces the same structured source snippet for direct import and CLI conversion

#### Scenario: Producer supplies canonical enrichment
- **WHEN** a Playwright attempt or error supplies supported canonical logs, source snippet, or generated test case fields
- **THEN** canonical extraction validates and preserves each valid field according to documented precedence rules

#### Scenario: Optional enrichment is malformed
- **WHEN** one optional diagnostic field is malformed or exceeds its configured limit
- **THEN** that field is discarded independently without rejecting valid errors, results, or other diagnostic fields

### Requirement: Extensible provider implementation
Adding a new source mapper SHALL require registering the mapper and implementing the shared source-mapper contract, without modifying existing source mappers or adding source checks to CTRF serialization.

#### Scenario: New provider is introduced
- **WHEN** a Jest, Cypress, JUnit, or other source mapper is added
- **THEN** it can produce the normalized representation and use the common serializer without changing the Playwright mapper

