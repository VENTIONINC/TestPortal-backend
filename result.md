# Delete Logic Analysis - Test Portal Backend

**Date:** 2025-11-09
**Scope:** Routes requiring delete endpoint implementation

---

## Current State

### Existing DELETE Endpoints (4)

| Entity | Route | Status | Notes |
|--------|-------|--------|-------|
| **Projects** | `DELETE /v2/projects/:id` | ✅ Implemented | Blocks deletion if has executions/specs/issues |
| **Issues** | `DELETE /v2/issues/:issueId` | ✅ Implemented | Cascades to assumptions |
| **User MCP Token** | `DELETE /v2/users/:userId/mcp-token` | ✅ Implemented | Token revocation only |
| **Upload API Keys** | `DELETE /v2/upload/keys/:id` | ✅ Implemented | Revokes key |

---

## Entity Relationship Hierarchy

```
Project (ROOT)
├── Executions
│   └── Results
│       └── ResultErrors
│           └── Assumptions
├── Specs
│   └── Results
│       └── ResultErrors
│           └── Assumptions
├── Issues
│   └── Assumptions
└── UploadApiKeys

User
├── Projects (owner)
├── Issues (created/updated by)
└── UploadApiKeys (owner)
```

---

## Missing DELETE Endpoints (4)

### 1. Assumptions - `DELETE /v2/assumptions/:assumptionId`

**Priority:** MEDIUM
**Risk:** LOW
**Effort:** 2-3 hours

**Current Routes:**
- `POST /v2/assumptions` ✅
- `PATCH /v2/assumptions/:assumptionId` ✅
- `GET /v2/assumptions/:assumptionId` ✅
- `DELETE /v2/assumptions/:assumptionId` ❌ **MISSING**

**Relationship:**
- Child of: `ResultError` and `Issue`
- No children (leaf node)

**Cascade Strategy:**
- **Hard delete** - Simple removal, no cascade needed
- No child entities to handle

**Implementation:**
```
Route:      DELETE /v2/assumptions/:assumptionId
Controller: assumptionController.deleteAssumption()
Service:    assumptionService.deleteAssumption()
Model:      assumptionModel.delete()
```

**Files to modify:**
- `/src/routes/assumptions.ts`
- `/src/controllers/assumptionController.ts`
- `/src/services/assumptionService.ts`
- `/src/models/assumptionModel.ts`

---

### 2. Results - `DELETE /v2/results/:resultId`

**Priority:** HIGH
**Risk:** MEDIUM
**Effort:** 3-4 hours

**Current Routes:**
- `GET /v2/results` ✅
- `GET /v2/results/:resultId` ✅
- `GET /v2/results-stats` ✅
- `PATCH /v2/results/:resultId/analysis` ✅
- `DELETE /v2/results/:resultId` ❌ **MISSING**

**Relationship:**
- Parent of: `ResultError[]` → `Assumption[]`
- Child of: `Execution` and `Spec`

**Cascade Strategy:**
- **Hard delete with cascade**
- Must delete child entities in order:
  1. Delete `Assumptions` where `resultErrorId IN (SELECT id FROM ResultError WHERE resultId = :resultId)`
  2. Delete `ResultErrors` where `resultId = :resultId`
  3. Delete `Result`

**Implementation:**
```typescript
// Use Prisma cascade delete
await prisma.result.delete({
  where: { id: resultId },
  include: {
    errors: {
      include: {
        assumptions: true
      }
    }
  }
});
```

**Files to modify:**
- `/src/routes/results.ts`
- `/src/controllers/resultController.ts`
- `/src/services/resultService.ts`
- `/src/models/resultModel.ts`

---

### 3. Executions - `DELETE /v2/executions/:executionId`

**Priority:** HIGH
**Risk:** HIGH
**Effort:** 4-6 hours

**Current Routes:**
- `GET /v2/executions/:executionId` ✅
- `DELETE /v2/executions/:executionId` ❌ **MISSING**

**Relationship:**
- Parent of: `Result[]` → `ResultError[]` → `Assumption[]`
- Child of: `Project`

**Cascade Strategy:**
- **Hard delete with deep cascade** (4 levels)
- Cascade chain:
  1. Find all `Results` where `executionId = :executionId`
  2. For each Result:
     - Find all `ResultErrors`
     - For each ResultError:
       - Delete all `Assumptions`
     - Delete all `ResultErrors`
  3. Delete all `Results`
  4. Delete `Execution`

**Implementation:**
```typescript
// Use Prisma cascade delete
await prisma.execution.delete({
  where: { id: executionId },
  include: {
    results: {
      include: {
        errors: {
          include: {
            assumptions: true
          }
        }
      }
    }
  }
});
```

**Files to modify:**
- `/src/routes/executions.ts`
- `/src/controllers/executionController.ts`
- `/src/services/executionService.ts`
- `/src/models/executionModel.ts`

---

### 4. Specs - `DELETE /v2/specs/:specId`

**Priority:** MEDIUM-HIGH
**Risk:** HIGH
**Effort:** 4-6 hours

**Current Routes:**
- `GET /v2/specs/:specId` ✅
- `DELETE /v2/specs/:specId` ❌ **MISSING**

**Relationship:**
- Parent of: `Result[]` → `ResultError[]` → `Assumption[]`
- Child of: `Project`

**Cascade Strategy:**
- **Hard delete with deep cascade** (4 levels)
- Cascade chain (same as Executions):
  1. Find all `Results` where `specId = :specId`
  2. For each Result:
     - Find all `ResultErrors`
     - For each ResultError:
       - Delete all `Assumptions`
     - Delete all `ResultErrors`
  3. Delete all `Results`
  4. Delete `Spec`

**Implementation:**
```typescript
// Use Prisma cascade delete
await prisma.spec.delete({
  where: { id: specId },
  include: {
    results: {
      include: {
        errors: {
          include: {
            assumptions: true
          }
        }
      }
    }
  }
});
```

**Files to modify:**
- `/src/routes/specs.ts`
- `/src/controllers/specController.ts`
- `/src/services/specService.ts`
- `/src/models/specModel.ts`

---

## Cascade Delete Summary

### Deletion Dependency Tree

```
Assumptions (LEAF) - No cascade needed
    ↑
ResultErrors - Cascade to Assumptions
    ↑
Results - Cascade to ResultErrors → Assumptions
    ↑
Executions - Cascade to Results → ResultErrors → Assumptions
Specs - Cascade to Results → ResultErrors → Assumptions
    ↑
Projects - Currently BLOCKS deletion (no cascade)
```

### Cascade Strategies by Entity

| Entity | Strategy | Cascade Depth | Child Entities |
|--------|----------|---------------|----------------|
| **Assumptions** | Hard delete | 0 | None (leaf) |
| **Results** | Hard delete + cascade | 2 levels | ResultErrors → Assumptions |
| **Executions** | Hard delete + cascade | 4 levels | Results → ResultErrors → Assumptions |
| **Specs** | Hard delete + cascade | 4 levels | Results → ResultErrors → Assumptions |

---

## Implementation Roadmap

### Phase 1: Simple Deletes (Priority: MEDIUM)
**Entities:** Assumptions
**Effort:** 2-3 hours
**Risk:** LOW

- Add DELETE endpoint for Assumptions
- Simple delete, no cascade logic needed

### Phase 2: Critical Deletes (Priority: HIGH)
**Entities:** Results, Executions
**Effort:** 7-10 hours
**Risk:** MEDIUM-HIGH

- Add DELETE endpoint for Results (with cascade to ResultErrors → Assumptions)
- Add DELETE endpoint for Executions (with deep cascade)
- Essential for data cleanup workflows

### Phase 3: Spec Cleanup (Priority: MEDIUM-HIGH)
**Entities:** Specs
**Effort:** 4-6 hours
**Risk:** HIGH

- Add DELETE endpoint for Specs (with deep cascade)
- Important for test suite management

---

## Total Effort Estimate

| Phase | Entities | Hours | Priority |
|-------|----------|-------|----------|
| Phase 1 | Assumptions | 2-3 | MEDIUM |
| Phase 2 | Results, Executions | 7-10 | HIGH |
| Phase 3 | Specs | 4-6 | MEDIUM-HIGH |
| **TOTAL** | **4 endpoints** | **13-19 hours** | - |

---

## Files to Modify

### Per Entity Pattern

For each entity (Assumptions, Results, Executions, Specs):

1. **Routes** - Add DELETE route
   - `/src/routes/{entity}.ts`

2. **Controller** - Add delete controller method
   - `/src/controllers/{entity}Controller.ts`

3. **Service** - Add delete service method with cascade logic
   - `/src/services/{entity}Service.ts`

4. **Model** - Add delete model method
   - `/src/models/{entity}Model.ts`

### MVC Pattern Example

```typescript
// Route
router.delete("/v2/results/:resultId", authMiddleware, resultController.deleteResult);

// Controller
async deleteResult(req: Request, res: Response): Promise<void> {
  await resultService.deleteResult(req.params.resultId);
  res.status(204).send();
}

// Service
async deleteResult(resultId: string): Promise<void> {
  const result = await resultModel.findById(resultId);
  if (!result) throw new Error("Result not found");
  await resultModel.delete(resultId);
}

// Model
async delete(id: string): Promise<void> {
  await prisma.result.delete({ where: { id } });
}
```

---

## Considerations

### Database-Level Cascade

Prisma doesn't use database-level CASCADE constraints. All cascade logic must be handled in application code.

**Options:**

1. **Manual cascade** - Delete children first, then parent
2. **Prisma implicit cascade** - Include child relations in delete operation
3. **Database migration** - Add ON DELETE CASCADE to foreign keys (recommended for long-term)

**Recommendation:** Use Prisma's delete with `include` to handle cascade implicitly.

### Transaction Safety

For multi-level cascades, wrap deletions in transactions:

```typescript
await prisma.$transaction(async (tx) => {
  await tx.result.delete({
    where: { id: resultId },
    include: {
      errors: {
        include: {
          assumptions: true
        }
      }
    }
  });
});
```

### Error Handling

- Return 404 if entity not found
- Return 204 on successful deletion
- Log cascade operations for audit trail

---

## Next Steps

1. ✅ Review and approve this analysis
2. ⬜ Implement Phase 1 (Assumptions DELETE)
3. ⬜ Implement Phase 2 (Results + Executions DELETE)
4. ⬜ Implement Phase 3 (Specs DELETE)
5. ⬜ Add integration tests for cascade delete behavior
6. ⬜ Update API documentation
