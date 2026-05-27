# Output Examples

## Boundary Review Findings

```markdown
**Findings**
- **Medium** [src/services/resultService.ts:88] Service accepts an Express `Request` object.
  Why it matters: This couples business logic to HTTP and makes MCP reuse harder.
  Correction: Pass a typed params object from the controller, then keep request parsing in `src/controllers/resultController.ts`.

- **Low** [src/models/resultModel.ts:34] Model performs status-label formatting.
  Why it matters: Presentation logic in the persistence layer makes future API shape changes harder.
  Correction: Return raw persistence data and format in the service or DTO mapper.

**Summary**
The route structure is fine; the main cleanup is keeping HTTP concerns out of the service.
```

## No Findings

```markdown
**Findings**
No MVC boundary issues found. Controllers, services, models, and MCP handlers keep their responsibilities separated.

**Residual Risk**
I did not inspect unrelated feature modules outside this change.
```
