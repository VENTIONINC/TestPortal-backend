## MODIFIED Requirements

### Requirement: Summary listing preserves project isolation and pagination
The shared summary path SHALL preserve the existing project predicate, pagination envelope, and validation limits. Optional search and creator filters SHALL be applied before pagination and counting. Default ordering SHALL remain creation time descending and then ID descending; explicit sort modes SHALL use the deterministic ordering defined below. Rows and totals in one response SHALL describe the same filtered data snapshot.

#### Scenario: Only the requested project is returned
- **WHEN** matching scenarios exist in multiple projects and a client lists one project with any combination of search, creator, and sort inputs
- **THEN** every returned summary belongs to the requested project
- **AND** no creator or scenario data from another project is returned through that query or included in its total

#### Scenario: Pagination behavior is unchanged
- **WHEN** a client lists summaries with valid page and limit inputs and omits new options
- **THEN** the response contains `scenarios`, `total`, `page`, `limit`, and `totalPages` using the existing rules
- **AND** records are ordered by `createdAt` descending and then `id` descending

#### Scenario: Empty project page is stable
- **WHEN** a valid project context contains no matching scenarios
- **THEN** REST and MCP return an empty `scenarios` array with zero pagination totals

#### Scenario: Combined filters determine pagination totals
- **WHEN** a client supplies both search and creator filters with pagination
- **THEN** only scenarios satisfying both filters are eligible for the page
- **AND** `total` counts all matching scenarios before pagination and `totalPages` is calculated from that total
- **AND** a page beyond the matching results is empty while retaining the matching total

## ADDED Requirements

### Requirement: Scenario summaries support literal text search
REST and MCP listing SHALL accept optional string `search`, trim surrounding whitespace, and match the entire remaining value as a case-insensitive literal substring of `title` only. Omitted, empty, or whitespace-only search SHALL impose no text filter. Search SHALL NOT include `details`, other authored fields or generated Markdown.

#### Scenario: Search matches title
- **WHEN** a query differs in case from a substring of a scenario title
- **THEN** the scenario is eligible for the filtered list
- **AND** the value of details does not affect whether the title matches

#### Scenario: Clear search
- **WHEN** the client supplies empty or whitespace-only search
- **THEN** results are the same as omitting search with all other inputs equal

#### Scenario: Pattern characters are literal
- **WHEN** search contains `%`, `_`, or a backslash
- **THEN** these characters are matched literally rather than interpreted as wildcard syntax

#### Scenario: Noncatalog fields do not match
- **WHEN** search occurs only in details, a scenario step, objective, or generated Markdown and not in title
- **THEN** that scenario does not match the text filter

### Requirement: Scenario summaries support creator filtering
REST and MCP listing SHALL accept optional UUID `createdById` and match scenarios whose creator ID equals that value. Omission SHALL include all creators within the project. A valid UUID without matching scenarios SHALL return an empty result rather than a user-not-found error.

#### Scenario: Filter selected creator
- **WHEN** the client supplies a creator UUID
- **THEN** all returned summaries have that `createdById`
- **AND** the existing safe creator summary is preserved

#### Scenario: Unknown creator
- **WHEN** a valid creator UUID has no matching scenarios in the project
- **THEN** the list and matching totals are empty

### Requirement: Scenario summaries support selectable deterministic sorting
REST and MCP listing SHALL accept `sort` with values `recently_created`, `recently_updated`, and `title_asc`. Omission SHALL mean `recently_created`. Ordering SHALL be respectively `createdAt DESC, id DESC`, `updatedAt DESC, id DESC`, and `title ASC, id ASC`. Title ordering SHALL use the database's configured collation.

#### Scenario: Recently updated order
- **WHEN** a client chooses `recently_updated`
- **THEN** scenarios with newer updated timestamps precede older ones
- **AND** equal timestamps are ordered by ID descending

#### Scenario: Alphabetical title order
- **WHEN** a client chooses `title_asc`
- **THEN** matching scenarios are ordered by title ascending under the configured collation
- **AND** equal titles are ordered by ID ascending

#### Scenario: Explicit creation order
- **WHEN** a client chooses `recently_created`
- **THEN** the order equals the existing default, including ID descending for equal creation timestamps

### Requirement: Catalog query options have aligned validated transport contracts
OpenAPI and the MCP list tool SHALL document the new options, defaults, accepted values, literal search semantics, and matching pagination totals. Equivalent REST and MCP requests SHALL produce equivalent lightweight summaries and totals. Existing summary fields and safe creator selection SHALL remain unchanged. Invalid new parameter types, invalid creator UUIDs, and unsupported sort values SHALL be rejected rather than silently ignored.

#### Scenario: Invalid options are rejected
- **WHEN** a client supplies a non-string search, malformed creator UUID, or unsupported sort value
- **THEN** REST rejects the request with HTTP 400 and MCP reports an input validation error under its existing error convention

#### Scenario: REST and MCP parity
- **WHEN** authenticated clients list the same unchanged project with equivalent filters, sort, and pagination through REST and MCP
- **THEN** both return the same ordered summaries and pagination values
- **AND** neither response includes full scenario content or additional User fields

#### Scenario: Contract discovery
- **WHEN** a client inspects OpenAPI or the MCP list tool schema and description
- **THEN** it can discover `search`, `createdById`, and the three supported `sort` values with their defaults and semantics
