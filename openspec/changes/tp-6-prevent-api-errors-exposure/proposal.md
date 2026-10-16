# Proposal

## Why

Unexpected failures in the error formatting and result suggestion endpoints can expose internal exception text to API clients. Returning a stable, generic failure message while retaining diagnostic details in server logs prevents leaking implementation or AI-provider details and gives clients a safe response.

## What Changes

- Return a generic safe error message from both error formatter handlers when their service operation fails.
- Keep diagnostic failure details available in server logs without including the original exception message in HTTP responses.
- Preserve successful response behavior and invalid request handling.
- Add regression coverage for both handlers to verify failure responses do not contain the original exception text.

## Capabilities

### New Capabilities

- `error-formatting`: Defines safe failure responses for the error formatting and result-based suggestion endpoints.

### Modified Capabilities

None.

## Impact

- `src/controllers/errorFormatterController.ts` and `__tests__/controllers/errorFormatterController.test.ts`.
- The REST behavior of `POST /api/v2/error-formatter` and `POST /api/v2/error-formatter/result`; successful response contracts and request validation remain unchanged.
- Existing service logging in `src/services/errorFormatterService.ts` must retain useful diagnostics while the HTTP layer avoids exposing exception details.
