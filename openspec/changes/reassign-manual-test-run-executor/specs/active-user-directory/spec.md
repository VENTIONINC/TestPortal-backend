## ADDED Requirements

### Requirement: Provide a general active-user directory

The system SHALL provide an authenticated, non-admin-only endpoint for listing users available for client selection. It SHALL return active users only and expose only their `id`, `name`, and `email`. The endpoint SHALL be available to any authenticated active user and SHALL NOT use or alter the administrator-only account-management endpoint.

#### Scenario: Authenticated caller loads users

- **WHEN** an authenticated active user requests the general user list
- **THEN** the system SHALL return active users with safe identity fields in deterministic order
- **AND** the caller SHALL NOT need the administrator role

#### Scenario: Inactive users are omitted

- **WHEN** the general user list is requested
- **THEN** pending and suspended accounts SHALL not appear in the response

#### Scenario: Unauthenticated caller requests users

- **WHEN** a request lacks valid authentication for an active user
- **THEN** the system SHALL reject it under the existing authentication lifecycle
