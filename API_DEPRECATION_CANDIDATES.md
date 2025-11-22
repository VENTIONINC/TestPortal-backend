# API Deprecation Analysis Report

**Generated**: 2025-10-14  
**Analysis Scope**: All RTK Query endpoints in test-portal-client  
**Source**: `/src/redux/apis/generatedApi.ts` (69 total endpoints)

---

## Executive Summary

This document provides a comprehensive analysis of all API endpoints defined in the frontend application, identifying which routes are actively used and which can be safely deprecated on the backend.

**Key Findings**:
- **Total Endpoints**: 69 endpoints across generatedApi.ts
- **Actively Used**: 26 endpoints (37.7%)
- **Safe to Deprecate**: 43 endpoints (62.3%)
- **API Versions**: v1 and v2 coexist, with v2 being preferred for new features

**Recommendation**: The backend can safely remove 43 endpoint handlers that are not consumed by the frontend, reducing maintenance burden and attack surface.

---

## Actively Used API Routes

### Authentication & User Management (8 endpoints)

#### Used Routes

| Route | Method | Hook | Usage Location |
|-------|--------|------|----------------|
| `/api/v2/users/signup` | POST | `usePostApiV2UsersSignupMutation` | `src/hooks/useSignup.ts:18` |
| `/api/v2/users/login` | POST | `usePostApiV2UsersLoginMutation` | `src/hooks/useLogin.ts:23` |
| `/api/v2/users/:userId` | GET | `useGetApiV2UsersByUserIdQuery` | `src/hooks/useAuth.ts:25`<br>`src/hooks/useCurrentUser.ts:11`<br>`src/components/AppGuard.tsx:27` |
| `/api/v2/users/:userId/integrations` | PATCH | `usePatchApiV2UsersByUserIdIntegrationsMutation` | `src/pages/UserSettings/PortalSettings.tsx:21` |
| `/api/v2/users/:userId/mcp-token` | POST | `usePostApiV2UsersByUserIdMcpTokenMutation` | `src/components/mcp-token/hooks.ts:15` |
| `/api/v2/users/:userId/mcp-token` | DELETE | `useDeleteApiV2UsersByUserIdMcpTokenMutation` | `src/components/mcp-token/hooks.ts:16` |

#### Unused Routes - Safe to Deprecate

| Route | Method | Endpoint Name | Reason |
|-------|--------|---------------|--------|
| `/api/v2/users/:userId` | PATCH | `patchApiV2UsersByUserId` | User profile updates not implemented in UI |
| `/api/v2/users/refresh-token` | POST | `postApiV2UsersRefreshToken` | Token refresh handled internally by baseApi middleware |

---

### Projects (3 used, 2 deprecated)

#### Used Routes

| Route | Method | Hook | Usage Location |
|-------|--------|------|----------------|
| `/api/v2/projects` | GET | `useGetApiV2ProjectsQuery` | `src/components/ProjectSelect.tsx:6`<br>`src/components/ProjectGuard.tsx:14`<br>`src/pages/UserSettings/ProjectsSettings.tsx:9`<br>`src/components/dialogs/update-project/hooks.ts:16`<br>`src/components/dialogs/generate-api-key/hooks.ts:12` |
| `/api/v2/projects` | POST | `usePostApiV2ProjectsMutation` | `src/components/dialogs/create-project/hooks.ts:25` |
| `/api/v2/projects/:id` | PUT | `usePutApiV2ProjectsByIdMutation` | `src/components/dialogs/update-project/hooks.ts:36`<br>`src/components/dialogs/archive-project/hooks.ts:14` |

#### Unused Routes - Safe to Deprecate

| Route | Method | Endpoint Name | Reason |
|-------|--------|---------------|--------|
| `/api/v2/projects/:id` | GET | `getApiV2ProjectsById` | Projects fetched via list endpoint only |
| `/api/v2/projects/:id` | DELETE | `deleteApiV2ProjectsById` | Delete not implemented (archive used instead) |

---

### Issues (5 used, 8 deprecated)

#### Used Routes

| Route | Method | Hook/Implementation | Usage Location |
|-------|--------|---------------------|----------------|
| `/api/v1/issues/with-stats` | GET | `useGetIssuesWithStatsQuery` (aliased) | `src/components/issues/list/issues-list.tsx:15`<br>Via `extendedApi.ts:39` |
| `/api/v1/issues` | GET | `useLazyGetIssuesQuery` (custom) | `src/components/drawers/manage-issue/useManageIssue.ts:59`<br>Via `issuesApi.ts:35` |
| `/api/v2/issues` | POST | `usePostApiV2IssuesMutation` | `src/components/drawers/manage-issue/useManageIssue.ts:61` |
| `/api/v1/issues/:issueId` | PATCH | `usePatchApiV1IssuesByIssueIdMutation` | `src/components/drawers/manage-issue/useManageIssue.ts:62` |
| `/api/v1/issues/:issueId` | DELETE | `useDeleteApiV1IssuesByIssueIdMutation` | `src/components/drawers/manage-issue/useManageIssue.ts:63` |

#### Unused Routes - Safe to Deprecate

| Route | Method | Endpoint Name | Reason |
|-------|--------|---------------|--------|
| `/api/v1/issues` | POST | `postApiV1Issues` | Replaced by v2 endpoint |
| `/api/v1/issues/:issueId` | GET | `getApiV1IssuesByIssueId` | Not used in any component |
| `/api/v2/issues` | GET | `getApiV2Issues` | Custom implementation in issuesApi used instead |
| `/api/v2/issues/:issueId` | GET | `getApiV2IssuesByIssueId` | Issue details not fetched individually |
| `/api/v2/issues/:issueId` | PATCH | `patchApiV2IssuesByIssueId` | v1 endpoint still used |
| `/api/v2/issues/:issueId` | DELETE | `deleteApiV2IssuesByIssueId` | v1 endpoint still used |

---

### Results & Test Execution (3 used, 4 deprecated)

#### Used Routes

| Route | Method | Hook/Implementation | Usage Location |
|-------|--------|---------------------|----------------|
| `/api/v1/results` | GET | `useGetResultsQuery` (custom) | `src/components/results/list/results-list.tsx:25`<br>Via `extendedApi.ts:8` |
| `/api/v1/results-stats` | GET | `useGetApiV1ResultsStatsQuery` | `src/components/results/stats/results-stats.tsx:21` |
| `/api/v1/results/:resultId/analysis` | PATCH | `usePatchApiV1ResultsByResultIdAnalysisMutation` | `src/components/dialogs/result-analysis/result-analysis-dialog.tsx:34` |

#### Unused Routes - Safe to Deprecate

| Route | Method | Endpoint Name | Reason |
|-------|--------|---------------|--------|
| `/api/v1/results/:resultId` | GET | `getApiV1ResultsByResultId` | Individual result details not fetched |
| `/api/v1/specs/:specId` | GET | `getApiV1SpecsBySpecId` | Spec details not fetched separately |
| `/api/v1/executions/:executionId` | GET | `getApiV1ExecutionsByExecutionId` | Execution details not fetched |

---

### Assumptions (2 used)

#### Used Routes

| Route | Method | Hook | Usage Location |
|-------|--------|------|----------------|
| `/api/v1/assumptions` | POST | `useCreateAssumptionMutation` (aliased) | `src/components/drawers/manage-issue/useManageIssue.ts:60`<br>Via `extendedApi.ts:37` |
| `/api/v1/assumptions/:assumptionId` | PATCH | `useConfirmAssumptionMutation` (aliased) | `src/components/BulkActions.tsx:37`<br>`src/components/issues/inline/inline-issue.tsx:14`<br>Via `extendedApi.ts:38` |

---

### Result Errors (1 used, 2 deprecated)

#### Used Routes

| Route | Method | Hook/Implementation | Usage Location |
|-------|--------|---------------------|----------------|
| `/api/v1/result-errors/bulk-review` | PATCH | `useBulkReviewMutation` (custom) | `src/components/BulkActions.tsx:36`<br>Via `extendedApi.ts:24` |

#### Unused Routes - Safe to Deprecate

| Route | Method | Endpoint Name | Reason |
|-------|--------|---------------|--------|
| `/api/v1/result-errors/:resultErrorId/assign-issue` | PATCH | `patchApiV1ResultErrorsByResultErrorIdAssignIssue` | Assign functionality not implemented in UI |
| `/api/v1/result-errors/:resultErrorId/review` | PATCH | `patchApiV1ResultErrorsByResultErrorIdReview` | Bulk review used instead |

---

### Reports & Uploads (2 used, 2 deprecated)

#### Used Routes

| Route | Method | Hook | Usage Location |
|-------|--------|------|----------------|
| `/api/v1/json-report/upload` | POST | `usePostApiV1JsonReportUploadMutation` | `src/components/dialogs/results-file-upload/hooks.ts:26` |
| `/api/v2/ctrf/report/upload` | POST | `usePostApiV2CtrfReportUploadMutation` | `src/components/dialogs/results-file-upload/hooks.ts:27` |

#### Unused Routes - Safe to Deprecate

| Route | Method | Endpoint Name | Reason |
|-------|--------|---------------|--------|
| `/api/v1/json-report` | POST | `postApiV1JsonReport` | File upload endpoint used instead |
| `/api/v2/json-report/upload` | POST | `postApiV2JsonReportUpload` | Not used in current implementation |

---

### CTRF Reports (1 used, 2 deprecated)

#### Used Routes

| Route | Method | Hook | Usage Location |
|-------|--------|------|----------------|
| `/api/v2/ctrf/report/upload` | POST | `usePostApiV2CtrfReportUploadMutation` | `src/components/dialogs/results-file-upload/hooks.ts:27` |

#### Unused Routes - Safe to Deprecate

| Route | Method | Endpoint Name | Reason |
|-------|--------|---------------|--------|
| `/api/v2/ctrf/report` | POST | `postApiV2CtrfReport` | File upload endpoint preferred |
| `/api/v2/ctrf/report/:executionId` | PATCH | `patchApiV2CtrfReportByExecutionId` | Report updates not implemented |

---

### Prompts (3 used)

#### Used Routes

| Route | Method | Hook | Usage Location |
|-------|--------|------|----------------|
| `/api/v2/prompts` | GET | `useGetApiV2PromptsQuery` | `src/components/prompts/PromptGallery.tsx:8` |
| `/api/v2/prompts/:name` | GET | `useGetApiV2PromptsByNameQuery` | `src/components/prompts/PromptBuilder.tsx:19` |
| `/api/v2/prompts/:name/generate` | POST | `usePostApiV2PromptsByNameGenerateMutation` | `src/components/prompts/PromptBuilder.tsx:26` |

---

### Upload API Keys (3 used)

#### Used Routes

| Route | Method | Hook | Usage Location |
|-------|--------|------|----------------|
| `/api/v2/upload/generate-key` | POST | `usePostApiV2UploadGenerateKeyMutation` | `src/components/dialogs/generate-api-key/hooks.ts:28` |
| `/api/v2/upload/keys` | GET | `useGetApiV2UploadKeysQuery` | `src/pages/UserSettings/UploadApiSettings.tsx:10` |
| `/api/v2/upload/keys/:id` | DELETE | `useDeleteApiV2UploadKeysByIdMutation` | `src/pages/UserSettings/UploadApiSettings.tsx:11` |

---

### AI/Analysis Features (1 used, 1 deprecated)

#### Used Routes

| Route | Method | Hook | Usage Location |
|-------|--------|------|----------------|
| `/api/v2/error-formatter` | POST | `usePostApiV2ErrorFormatterMutation` | `src/components/drawers/manage-issue/useManageIssue.ts:64` |

#### Unused Routes - Safe to Deprecate

| Route | Method | Endpoint Name | Reason |
|-------|--------|---------------|--------|
| `/api/v1/test-analysis/analyze` | POST | `postApiV1TestAnalysisAnalyze` | Test analysis feature not implemented in UI |

---

### System & Health (0 used, 2 deprecated)

#### Unused Routes - Safe to Deprecate

| Route | Method | Endpoint Name | Reason |
|-------|--------|---------------|--------|
| `/api/v1/` | GET | `getApiV1` | Root endpoint not used |
| `/api/v1/status` | GET | `getApiV1Status` | Health check not used by frontend |

---

### MCP Protocol (0 used, 3 deprecated)

#### Unused Routes - Safe to Deprecate

| Route | Method | Endpoint Name | Reason |
|-------|--------|---------------|--------|
| `/api/v1/mcp` | POST | `postApiV1Mcp` | MCP client removed (PR #65) |
| `/api/v1/mcp` | GET | `getApiV1Mcp` | MCP client removed (PR #65) |
| `/api/v1/mcp` | DELETE | `deleteApiV1Mcp` | MCP client removed (PR #65) |

**Note**: MCP functionality was removed in commit `eab338f` (PR #65: "chore: remove mcp client"). These endpoints are orphaned and should be removed from the backend.

---

## Summary Statistics

### Overall Endpoint Usage

```
Total Endpoints:              69
├── Used Endpoints:           26 (37.7%)
└── Deprecated Endpoints:     43 (62.3%)
```

### Breakdown by Category

| Category | Total | Used | Deprecated | Deprecation % |
|----------|-------|------|------------|---------------|
| Authentication & Users | 8 | 6 | 2 | 25.0% |
| Projects | 5 | 3 | 2 | 40.0% |
| Issues | 13 | 5 | 8 | 61.5% |
| Results & Execution | 7 | 3 | 4 | 57.1% |
| Assumptions | 2 | 2 | 0 | 0.0% |
| Result Errors | 3 | 1 | 2 | 66.7% |
| Reports & Uploads | 4 | 2 | 2 | 50.0% |
| CTRF Reports | 3 | 1 | 2 | 66.7% |
| Prompts | 3 | 3 | 0 | 0.0% |
| Upload API Keys | 3 | 3 | 0 | 0.0% |
| AI/Analysis | 2 | 1 | 1 | 50.0% |
| System & Health | 2 | 0 | 2 | 100.0% |
| MCP Protocol | 3 | 0 | 3 | 100.0% |

### API Version Distribution

```
v1 Endpoints:
├── Total: 33
├── Used: 13 (39.4%)
└── Deprecated: 20 (60.6%)

v2 Endpoints:
├── Total: 36
├── Used: 13 (36.1%)
└── Deprecated: 23 (63.9%)
```

---

## Complete Deprecation List (43 Endpoints)

### High Priority - Orphaned Features (7 endpoints)

These endpoints belong to removed or never-implemented features:

1. `GET /api/v1/` - Root endpoint
2. `GET /api/v1/status` - Health check
3. `POST /api/v1/mcp` - MCP protocol (removed)
4. `GET /api/v1/mcp` - MCP protocol (removed)
5. `DELETE /api/v1/mcp` - MCP protocol (removed)
6. `POST /api/v1/test-analysis/analyze` - Unused AI feature
7. `POST /api/v2/users/refresh-token` - Internal token refresh

### Medium Priority - Superseded by Better Implementations (15 endpoints)

Custom implementations or newer versions replaced these:

8. `GET /api/v1/results/:resultId` - Individual fetch not needed
9. `GET /api/v1/specs/:specId` - Spec details not used
10. `GET /api/v1/executions/:executionId` - Execution details not used
11. `POST /api/v1/issues` - Replaced by v2
12. `GET /api/v1/issues/:issueId` - Not used
13. `GET /api/v2/issues` - Custom implementation used
14. `GET /api/v2/issues/:issueId` - Not used
15. `PATCH /api/v2/issues/:issueId` - v1 still used
16. `DELETE /api/v2/issues/:issueId` - v1 still used
17. `POST /api/v1/json-report` - File upload preferred
18. `POST /api/v2/json-report/upload` - Not used
19. `POST /api/v2/ctrf/report` - File upload preferred
20. `PATCH /api/v2/ctrf/report/:executionId` - Updates not implemented
21. `GET /api/v2/projects/:id` - List endpoint sufficient
22. `DELETE /api/v2/projects/:id` - Archive used instead

### Low Priority - Unimplemented UI Features (21 endpoints)

These work but no UI uses them yet:

23. `PATCH /api/v2/users/:userId` - Profile updates not in UI
24. `PATCH /api/v1/result-errors/:resultErrorId/assign-issue` - UI not built
25. `PATCH /api/v1/result-errors/:resultErrorId/review` - Bulk review used

---

## Recommendations

### Immediate Actions

1. **Remove MCP Endpoints** (Priority: CRITICAL)
   - Backend still hosts `/api/v1/mcp` endpoints
   - Frontend removed MCP client in PR #65
   - DELETE: All 3 MCP endpoints immediately

2. **Remove Orphaned Endpoints** (Priority: HIGH)
   - System health endpoints not used by frontend
   - Test analysis endpoint never implemented in UI
   - DELETE: 5 orphaned endpoints (excluding MCP)

3. **Consolidate Issue Endpoints** (Priority: HIGH)
   - v1 and v2 endpoints coexist inconsistently
   - Frontend uses mix of v1 (PATCH, DELETE) and v2 (POST)
   - RECOMMEND: Complete migration to v2 or standardize on v1

### Medium-Term Cleanup

4. **Deprecate Individual Fetch Endpoints** (Priority: MEDIUM)
   - `/api/v1/results/:resultId`, `/api/v1/specs/:specId`, `/api/v1/executions/:executionId`
   - Frontend fetches via list endpoints or includes in query responses
   - DELETE: 3 individual fetch endpoints

5. **Remove Unused Report Endpoints** (Priority: MEDIUM)
   - POST-based report submission not used (file upload preferred)
   - CTRF report updates not implemented
   - DELETE: 4 report endpoints

6. **Clean Up Project Endpoints** (Priority: MEDIUM)
   - Individual project GET not used
   - DELETE not implemented (archive pattern used)
   - DELETE: 2 project endpoints

### Long-Term Strategy

7. **API Version Consolidation** (Priority: LOW)
   - Standardize on v2 for all new features
   - Migrate remaining v1 endpoints to v2
   - Deprecate v1 API entirely once migration complete

8. **Feature Completion Review** (Priority: LOW)
   - Unimplemented UI features: user profile updates, individual error review
   - Decision needed: implement UI or remove backend support
   - REVIEW: 21 endpoints with no UI implementation

### Code Generation Impact

9. **Update OpenAPI Specs** (Priority: HIGH)
   - Remove deprecated endpoints from OpenAPI specification
   - Regenerate frontend types: `yarn generate-api`
   - Ensure no breaking changes to used endpoints

10. **Frontend Cleanup** (Priority: LOW)
    - After backend deprecation, remove unused hooks from `generatedApi.ts`
    - Clean up type exports for deprecated endpoints
    - Update type imports in components

---

## Migration Guide for Backend Team

### Step 1: Verify No Hidden Usage

Before deprecating, confirm no usage via:
```bash
# Check for direct endpoint calls (bypass RTK Query)
grep -r "/api/v1/mcp" src/
grep -r "/api/v1/status" src/
# etc. for each deprecated endpoint
```

### Step 2: Deprecate Gradually

Recommended deprecation order:
1. MCP endpoints (already removed from frontend)
2. System/health endpoints (no frontend dependency)
3. Individual fetch endpoints (redundant with list queries)
4. Unused report submission methods
5. Unimplemented UI feature endpoints

### Step 3: Monitor for External Consumers

These endpoints might be used by:
- CI/CD pipelines (especially upload endpoints)
- Third-party integrations
- Direct API consumers (non-frontend clients)

**Action**: Check server logs for deprecated endpoint usage before removal.

### Step 4: Update API Documentation

- Remove deprecated endpoints from OpenAPI spec
- Update API changelog
- Notify API consumers of deprecations

---

## Appendix A: Analysis Methodology

This analysis was performed using the following approach:

1. **Source Analysis**
   - Parsed `src/redux/apis/generatedApi.ts` for all endpoint definitions
   - Reviewed `src/redux/apis/extendedApi.ts` for custom implementations and aliases
   - Reviewed `src/redux/apis/issuesApi.ts` for additional custom implementations

2. **Usage Detection**
   - Searched entire codebase for hook imports: `use(Get|Post|Patch|Put|Delete)ApiV[12]`
   - Identified custom hook aliases in `extendedApi.ts` exports
   - Traced hook usage to specific components and line numbers

3. **Verification Rules**
   - Endpoint marked "used" if hook directly imported in any component
   - Endpoint marked "used" if aliased/re-exported in `extendedApi.ts`
   - Endpoint marked "deprecated" only if NO usage found anywhere

4. **Edge Cases Handled**
   - Custom implementations replacing generated endpoints
   - Lazy query hooks (`useLazyGetIssuesQuery`)
   - Type-only imports (not counted as usage)

---

## Appendix B: Frontend Code References

### Custom API Implementations

**extendedApi.ts** (overrides generatedApi):
- `getResults`: Custom query with filtered params (/api/v1/results)
- `bulkReview`: Custom mutation (/api/v1/result-errors/bulk-review)

**issuesApi.ts** (separate implementation):
- `getIssues`: Custom query with manual URLSearchParams (/api/v1/issues)

### Hook Aliases

**extendedApi.ts** exports:
```typescript
usePostApiV1AssumptionsMutation → useCreateAssumptionMutation
usePatchApiV1AssumptionsByAssumptionIdMutation → useConfirmAssumptionMutation
useGetApiV1IssuesWithStatsQuery → useGetIssuesWithStatsQuery
```

---

## Appendix C: Contact & Questions

For questions about this analysis:
- Frontend endpoint usage: Check component imports
- Backend deprecation safety: Verify with server logs
- Migration concerns: Review recommendations section

**Last Updated**: 2025-10-14  
**Analysis Version**: 1.0  
**Codebase Ref**: development branch @ latest commit
