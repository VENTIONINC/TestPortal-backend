---
name: auth-security-review
description: Review authentication, authorization, token handling, validation boundaries, and API hardening in the test-portal backend. Use for auth-sensitive changes, JWT or refresh-token work, middleware updates, CORS/header changes, and defensive security review.
---

# Auth Security Review

Use this skill when a change touches authentication, authorization, session or token handling, request validation, security headers, CORS, secrets, or trust boundaries.

## Review Focus

- Authentication and authorization flows
- JWT and refresh-token creation, verification, storage, rotation, and expiry
- Password, credential, and secret handling
- Input validation at REST, MCP, controller, and service boundaries
- CORS, headers, transport assumptions, and exposed API surface
- Prisma query authorization filters and tenant/user scoping

## Procedure

1. Identify the entry points involved: routes, middleware, controllers, MCP handlers, and services.
2. Trace the trust boundary from request input through validation, authorization, business logic, and persistence.
3. Check whether access decisions happen before sensitive data is read or modified.
4. Verify token behavior: issuer, audience if present, expiry, refresh semantics, revocation, and error handling.
5. Look for accidental data exposure in response DTOs, logs, thrown errors, and OpenAPI/MCP schemas.
6. Separate concrete security findings from hardening suggestions.

## Output

- Lead with findings ordered by severity.
- Include affected file paths and the exact flow or boundary.
- Explain impact, attack preconditions, and a practical remediation.
- For concrete response shapes, load `references/output-examples.md`.
