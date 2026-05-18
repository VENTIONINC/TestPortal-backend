## ADDED Requirements

### Requirement: Artifact availability summary
The system SHALL expose a normalized artifact summary for Playwright reports that have a stored private S3 artifact reference.

#### Scenario: Artifact is available
- **WHEN** a client retrieves an execution or result that has a stored S3 artifact reference
- **THEN** the response SHALL include an artifact summary with provider `s3` and available `true`

#### Scenario: Artifact is not available
- **WHEN** a client retrieves an execution or result that does not have a stored S3 artifact reference
- **THEN** the response SHALL omit the artifact summary or return it with available `false`

#### Scenario: Private storage details are hidden
- **WHEN** a normal execution or result read response includes artifact availability
- **THEN** the response SHALL NOT include the S3 bucket, object key, AWS credentials, or signed URL

### Requirement: Playwright artifact reference ingestion
The system SHALL support storing a private S3 artifact reference while processing Playwright JSON report uploads.

#### Scenario: Playwright report contains artifact reference
- **WHEN** a Playwright JSON report is uploaded and artifact extraction yields an S3 artifact reference
- **THEN** the system SHALL persist the artifact provider and private object reference with the selected execution or result

#### Scenario: Playwright report has no artifact reference
- **WHEN** a Playwright JSON report is uploaded and artifact extraction does not yield an artifact reference
- **THEN** the system SHALL process the report successfully without persisted artifact metadata

#### Scenario: CTRF report upload
- **WHEN** a CTRF report is uploaded
- **THEN** the system SHALL NOT require artifact metadata and SHALL preserve existing CTRF processing behavior

### Requirement: Signed artifact URL retrieval
The system SHALL provide an authenticated on-demand flow for retrieving a temporary signed URL for a stored private S3 artifact.

#### Scenario: Authorized signed URL request
- **WHEN** an authenticated client requests a signed artifact URL for an artifact that belongs to a project the client can access
- **THEN** the system SHALL return a temporary signed URL and an expiration timestamp

#### Scenario: Missing artifact
- **WHEN** an authenticated client requests a signed artifact URL for an execution or result without a stored artifact reference
- **THEN** the system SHALL return a not found response

#### Scenario: Unauthorized signed URL request
- **WHEN** a client requests a signed artifact URL for an artifact outside the client's accessible project scope
- **THEN** the system SHALL deny the request

#### Scenario: Signed URL lifetime
- **WHEN** the system returns a signed artifact URL
- **THEN** the URL lifetime SHALL use the configured signed URL TTL

### Requirement: Runtime S3 configuration
The system SHALL use runtime deployment configuration for S3 signing.

#### Scenario: AWS configuration is present
- **WHEN** runtime S3 configuration is present and a signed URL is requested
- **THEN** the system SHALL use the configured AWS region, artifact bucket, and URL TTL to generate the response

#### Scenario: AWS configuration is missing
- **WHEN** runtime S3 configuration required for signing is missing and a signed URL is requested
- **THEN** the system SHALL return a clear server configuration error without exposing secrets
