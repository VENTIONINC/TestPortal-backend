## Auth Module — Getting Started (Target: Junior Engineers)

**Executive summary**
This module implements authentication for the Test Portal. It supports:

- App-managed JWT auth (access + refresh tokens) for protected routes.
- Cognito federation (signup/login) and Cognito-session passthrough.
- MCP tokens (self-contained tokens used to authenticate MCP clients).
- Enforced validations for signup/login (email format, domain policy, password rules).

This document was created from the repository code (types and tests are treated as the "truth").

---

## Prerequisites & environment

Before starting, you should have:

- Node.js + npm (the repo uses scripts in `package.json`).
- A development database or test DB (see Prisma config if needed).
- Optional: AWS Cognito (if you plan to use Cognito signup/login).
- Required environment variables:

Mandatory

- `JWT_SECRET` — used by `jwtService` to sign/verify access + refresh tokens (see `src/services/jwtService.ts`). The project will throw at startup if this is missing.

Optional, for MCP tools

- `MCP_SECRET` — used for creating and validating MCP tokens; required to call `userService.generateMcpToken` and used by `src/mcp/middleware/auth.ts`.

Optional, for Cognito

- `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_POOL_REGION` — configured in `src/config/environment.ts` and consumed by `src/config/cognitoConfig.ts`.

Useful

- `DEFAULT_PROJECT_ID`, `LANGSMITH_*` (for LangChain tracing).

See the example `.env` file: `.env.example` (root) for a helpful template.

---

## Installation & Quick Run

1. Install dependencies:

```bash
npm install
```

2. Start development server (example with env vars):

```bash
# Linux/macOS / WSL
export JWT_SECRET="$(openssl rand -hex 32)"
export MCP_SECRET="$(openssl rand -hex 32)"
# Optional Cognito vars for Cognito flows
export COGNITO_USER_POOL_ID="your-pool-id"
export COGNITO_CLIENT_ID="your-client-id"
export COGNITO_POOL_REGION="your-region"

npm run dev
```

Notes:

- `npm run dev` uses `nodemon --exec tsx index.ts`.
- `npm run inspector` will start the ModelContextProtocol (MCP) inspector for local MCP testing (see `package.json` and `docs/INSPECT_MCP_SERVER.md`).

---

## Contract — inputs, outputs, errors

- Inputs:
  - Signup: `{ name, email, password }` (types: `src/services/userService.ts` CreateUserParams)
  - Login: `{ email, password }` (types: `src/services/userService.ts` LoginParams)
  - Refresh token: `{ refreshToken }` (handled by `userController.refreshToken`)
  - MCP token generation: userId path param and Authorization header
- Outputs:
  - `AuthResponse` — `{ user, accessToken, refreshToken }` (see `src/services/jwtService.ts`)
- Success: JWT tokens created & returned (status 200 or 201 for signup)
- Errors: 401 for invalid credentials, 400 for invalid or missing request body, 500 for server errors

---

## Important file references (source of truth)

- `src/services/jwtService.ts` — JWT token generation/verification, types `JwtPayload`, `AuthResponse`, and `REFRESH/ACCESS` expirations.
- `src/middleware/authMiddleware.ts` — Token extraction and request `req.user` enrichment for protected routes.
- `src/services/userService.ts` — Primary user/service logic: signup, login, password hashing, token generation (including MCP), user updates.
- `src/controllers/userController.ts` — HTTP controllers for user endpoints.
- `src/routes/users.ts` — Routes wiring; be aware the repo exposes Cognito paths by default.
- `src/lib/mcp-token.ts` — Format and validator of MCP tokens used by MCP middleware.

---

## Endpoint Summary & Example Requests

All endpoints are mounted under `/api/v2`.

Public endpoints:

- `POST /api/v2/users/refresh-token` — Body: `{ refreshToken }` — returns `AuthResponse`.
- `POST /api/v2/users/signup` — (Cognito route) Body: `{ name, email, password }`.
- `POST /api/v2/users/login` — (Cognito route) Body: `{ email, password, newPassword? }` — returns `AuthResponse`.

Protected endpoints (require Bearer access token):

- `GET /api/v2/users/:userId` — Get user profile. Uses `authMiddleware`.
- `PATCH /api/v2/users/:userId` — Update user (name/email/password).
- `PATCH /api/v2/users/:userId/integrations` — Update user integrations.

MCP token routes (protected; must be called with a valid access token):

- `POST /api/v2/users/:userId/mcp-token` — Generate self-contained MCP token (requires `MCP_SECRET`).
- `DELETE /api/v2/users/:userId/mcp-token` — Revoke MCP token.

Example quick curl flow (see also `test-signup.http`):

```bash
# 1) Login (Cognito route)
curl -sS -X POST http://localhost:3001/api/v2/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ventionteams.com","password":"password123"}'

# Response includes accessToken + refreshToken
ACCESS_TOKEN=<accessToken>
# 2) Call protected endpoint
curl -sS -X GET http://localhost:3001/api/v2/users/<userId> \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Generate MCP token (must have `MCP_SECRET` set and call with a valid access token):

```bash
curl -s -X POST "http://localhost:3001/api/v2/users/<userId>/mcp-token" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Security & Behavior Highlights

- JWT tokens: `ACCESS_TOKEN_EXPIRES_IN = 7d`, `REFRESH_TOKEN_EXPIRES_IN = 30d` (see `src/services/jwtService.ts`).
- Missing `JWT_SECRET` causes server to throw during import time.
- `authMiddleware` extracts Bearer token, verifies it and populates `req.user` (see `src/middleware/authMiddleware.ts`).
- Passwords are hashed with Argon2 using specific cost parameters. See `argon2` usage in `userService.signup` and `userService.updateUser`.
- Signup policy: By default `userService.signup` only allows `@ventionteams.com` emails (domain enforcement) — local signups are limited unless Cognito is used.
- MCP token format & validation defined in `src/lib/mcp-token.ts`. `MCP_SECRET` is required for token generation/validation.

---

## Tests to use as examples (Test-driven docs)

- `__tests__/routes/users-auth.test.ts` — Signup -> login -> access protected route flow.
- `__tests__/routes/users-update-refresh.test.ts` — Refresh token tests.
- `__tests__/services/userService-mcp-token.test.ts` — Generate/revoke MCP token tests and `MCP_SECRET` env var checks.
- `test-signup.http` — Example HTTP requests for signup/login/refresh.

---

## Common Issues & Troubleshooting

1. Server exits with `JWT_SECRET environment variable is required` — set `JWT_SECRET` before starting.
2. `MCP_SECRET environment variable is not configured` when calling `POST /v2/users/:userId/mcp-token` — set `MCP_SECRET`.
3. 401 Unauthorized on protected endpoint — ensure `Authorization` header is `Bearer <accessToken>` and token is valid.
4. Cognito flows fail — ensure Cognito env vars (`COGNITO_*`) are set and Cognito is configured.
5. Local signup fails due to `Registration not allowed` — the code enforces `@ventionteams.com` email domain in `src/services/userService.ts`.

---

## Gap Analysis & Notes

- The code has both local and Cognito login/signup paths. `routes/users.ts` exposes Cognito routes:
  - `routes/users.ts` calls `userController.cognitoSignup` and `cognitoLogin`. Tests often call `userController.signup` and `login` directly for convenience.
  - Consider aligning the code to either prefer Cognito for production or clearly label local routes as legacy/testing-only.
- Types and interfaces are defined in `src/services` and should be used as the canonical API contract.

---

## How to test locally

1. Set env vars (JWT_SECRET, optional MCP_SECRET, optional Cognito settings)
2. Run server: `npm run dev`
3. Run tests: `npm test` (Jest) — tests include unit/controller tests for auth.

---

## Suggested follow-ups & improvements

- Add CI-run integration tests that exercise `src/routes/users.ts` (end-to-end).
- Add explicit OpenAPI schema or API docs generated from the types.
- Sync routing: remove or label local signup routes if Cognito is intended for production.
- Add `README`/`.env.example` entry for `JWT_SECRET` and `MCP_SECRET` clarifying their purpose.

---

## Where to read next

- `src/services/jwtService.ts`
- `src/middleware/authMiddleware.ts`
- `src/services/userService.ts`
- `src/controllers/userController.ts`
- `src/routes/users.ts`
- `src/lib/mcp-token.ts`
- Example requests: `test-signup.http`

---
