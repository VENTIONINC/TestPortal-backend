# Design

## Context

See [proposal.md](proposal.md) for the motivation and [specs/error-formatting/spec.md](specs/error-formatting/spec.md) for the observable contract. Both routes validate request bodies in the controller. The formatter service logs provider failures and replaces the thrown error with a generic message; the result suggestion service logs failures and rethrows them. The suggestion controller currently includes the caught message in its response.

## Goals / Non-Goals

**Goals:**
- Keep internal service exception details out of server-error responses from both handlers.
- Preserve useful diagnostics through the existing service logging path.
- Preserve success payloads and current request-body validation behavior.

**Non-Goals:**
- Change service algorithms, AI prompts, response success schemas, or request schemas.
- Change unrelated error handling or introduce a shared error framework.

## Decisions

- Apply the response boundary in `errorFormatterController`: unexpected service failures use each endpoint's stable generic message rather than `Error.message` or a serialized exception. The formatter's existing generic failure message can remain; the result suggestion handler needs an equivalent generic server-error message.
- Keep current status handling for recognized result-level validation failures so clients retain the established distinction between invalid result state and server failures. Genericize internal server-error responses; leave request-body validation responses untouched.
- Reuse the service's existing diagnostic logging. Both service methods already log caught failures before rethrowing or replacing them, so adding duplicate logging in the controller would create noisy duplicate records and can lose the original details after the formatter service wraps its exception.
- Add controller regression cases that reject each service call with a recognizable internal message and assert the message is absent from the response. Retain existing success and invalid-request tests as compatibility coverage.

Alternatives considered: changing the service methods to return transport-safe errors would mix HTTP response policy into service code; logging again in the controller would duplicate existing diagnostic records. The controller is the existing HTTP boundary and can safely map service failures without changing service contracts.

## Risks / Trade-offs

- [Risk] A future service may throw an unexpected error without logging it → Mitigation: keep service failure logging as an explicit part of the error formatter service contract and cover it when changing those service paths.
- [Trade-off] Clients lose detailed messages for internal failures → Mitigation: preserve expected result validation statuses and keep detailed diagnostics in server logs.

## Migration Plan

No data migration or deployment sequencing is required. Rollback can restore the prior controller error mapping if a client depends on internal failure details; successful and request-validation behavior remains unchanged.
