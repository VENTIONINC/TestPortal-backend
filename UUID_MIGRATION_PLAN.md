# UUID Migration Plan

## Status: In Progress

### Completed ✓
- [x] User table (id: Int → String @db.Uuid)
- [x] Project table (id: Int → String @db.Uuid)

### Remaining Tables to Migrate

#### Phase 1: Core Test Data Tables
1. **Execution** (id: Int → String @db.Uuid)
   - Foreign key in: Result.executionId
   - Priority: High (referenced by Result)

2. **Spec** (id: Int → String @db.Uuid)
   - Foreign key in: Result.specId
   - Priority: High (referenced by Result)

3. **Result** (id: Int → String @db.Uuid)
   - Foreign key in: ResultError.resultId
   - Priority: High (parent of ResultError)

#### Phase 2: Error & Analysis Tables
4. **ResultError** (id: Int → String @db.Uuid)
   - Foreign key in: Assumption.resultErrorId
   - Priority: Medium (parent of Assumption)

5. **Issue** (id: Int → String @db.Uuid)
   - Foreign key in: Assumption.issueId
   - Priority: Medium (parent of Assumption)

6. **Assumption** (id: Int → String @db.Uuid)
   - Foreign keys: issueId, resultErrorId (both need migration first)
   - Priority: Low (no child tables)

## Migration Order (Dependency-Based)

### Phase 1: Independent Tables
1. **Execution** - No dependencies on other int IDs
2. **Spec** - No dependencies on other int IDs
3. **Issue** - No dependencies on other int IDs

### Phase 2: First-Level Dependencies
4. **Result** - Depends on: Execution (executionId), Spec (specId)

### Phase 3: Second-Level Dependencies
5. **ResultError** - Depends on: Result (resultId)

### Phase 4: Final Dependencies
6. **Assumption** - Depends on: Issue (issueId), ResultError (resultErrorId)

## Migration Steps per Table

For each table:
1. Create Prisma migration to:
   - Change id field from `Int @id @default(autoincrement())` to `String @id @default(uuid()) @db.Uuid`
   - Update all foreign key references to `String @db.Uuid`
2. Update TypeScript types/interfaces
3. Update service layer logic
4. Update MCP tools/handlers
5. Update controllers
6. Update tests
7. Test database operations
8. Verify API endpoints
9. Verify MCP tools

## Affected Files per Table

### Execution
- `prisma/schema.prisma` - Model definition
- `src/models/executionModel.ts` - Database queries
- `src/services/executionService.ts` - Business logic
- `src/controllers/executionController.ts` - HTTP handlers
- `src/mcp/tools/execution/*.ts` - MCP tools
- `src/types/index.ts` - Type definitions
- `src/routes/*.ts` - Route parameters

### Spec
- `prisma/schema.prisma`
- `src/models/specModel.ts`
- `src/services/specService.ts`
- `src/controllers/specController.ts`
- `src/mcp/tools/spec/*.ts`
- `src/types/index.ts`

### Result
- `prisma/schema.prisma`
- `src/models/resultModel.ts`
- `src/services/resultService.ts`
- `src/controllers/resultController.ts`
- `src/mcp/tools/result/*.ts`
- `src/types/index.ts`

### ResultError
- `prisma/schema.prisma`
- `src/models/resultErrorModel.ts` (if exists)
- `src/services/resultService.ts` - Nested error handling
- `src/types/index.ts`

### Issue
- `prisma/schema.prisma`
- `src/models/issueModel.ts`
- `src/services/issueService.ts`
- `src/controllers/issueController.ts`
- `src/mcp/tools/issue/*.ts`
- `src/types/index.ts`

### Assumption
- `prisma/schema.prisma`
- `src/models/assumptionModel.ts` (if exists)
- `src/services/assumptionService.ts` (if exists)
- `src/types/index.ts`

## Testing Strategy

For each migration:
1. Run `npm run type-check` - TypeScript validation
2. Run `npm test` - Unit/integration tests
3. Manual API testing via curl/Postman
4. MCP inspector testing (`npm run inspector`)
5. Verify seed data works (`npm run seed`)

## Rollback Strategy

Each migration should be:
- Atomic per table
- Reversible via Prisma migration rollback
- Committed to separate git branches per phase
- Merged only after full testing

## Notes

- UUIDs are 36 characters vs int (max 10 digits)
- PostgreSQL native UUID type is efficient
- No performance concerns for this data volume
- All existing data will need conversion during migration
- Consider data backup before each phase
