# Output Examples

## Contract Drift Findings

```markdown
**Findings**
- **Medium** [src/lib/openapi/users.ts:214] OpenAPI documents `200` for MCP token generation, but `src/controllers/userController.ts` returns `201`.
  Fix: Update the OpenAPI response status or controller status so the contract matches runtime behavior.

- **Medium** [src/schemas/resultSchemas.ts:18] Runtime accepts `status=flaky`, but the documented enum omits it.
  Fix: Add `flaky` to the Zod/OpenAPI enum if supported behavior is intentional.
```

## Contract Update Summary

```markdown
Updated API contract alignment:
- `src/schemas/userSchemas.ts`: added response schema for token revocation.
- `src/lib/openapi/users.ts`: registered the revocation response and corrected status codes.
- `src/mcp/schemas/userSchemas.ts`: no change needed; this behavior is REST-only.

Intentionally not documented:
- Internal token HMAC payload format remains undocumented.
```
