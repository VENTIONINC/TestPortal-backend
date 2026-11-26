# Output Examples

## Security Findings

```markdown
**Findings**
- **High** [src/middleware/auth.ts:42] Missing project ownership check before token-scoped access.
  Impact: A valid user token can read another project's private results if the project id is guessed.
  Preconditions: Attacker has any authenticated account and knows or discovers a project id.
  Remediation: Check project membership before querying result rows, ideally in the service/model filter.

- **Low** [src/controllers/userController.ts:151] Error message distinguishes missing user from revoked token.
  Impact: User id enumeration is possible through response differences.
  Remediation: Return the same 404 response for both cases.

**Residual Risk**
No refresh-token storage review was possible because this change did not include the refresh-token persistence layer.
```

## No Concrete Issues

```markdown
**Findings**
No concrete security issues found in the changed auth flow.

**Residual Risk**
This review did not include dependency advisories or deployed CORS/header configuration.
```
