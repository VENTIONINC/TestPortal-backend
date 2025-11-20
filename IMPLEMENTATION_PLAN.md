# Implementation Plan: Move Analysis to Last Step (CTRF Only)

## Overview

Refactor CTRF report processing to perform AI analysis AFTER database records are created, using real DB IDs instead of fragile `workerIndex` matching.

## Current Flow Issues

1. Analysis runs on raw CTRF data before DB records exist
2. Matches analysis to results via `workerIndex` (line 269 jsonReportService.ts)
3. No real DB IDs available during analysis
4. Analysis happens in same transaction as upload (tightly coupled)

## Proposed New Flow (CTRF Only)

### Phase 1: Upload & Persist (No Analysis)

```
User → Upload CTRF Report
  ↓
ctrfService.processReport()
  ↓
transformCtrfToReportData() [NO analysis field]
  ↓
jsonReportService.processReport() [Creates execution, specs, results]
  ↓
Return: { success, executionId, specsProcessed }
```

### Phase 2: Fetch & Analyze (Post-Persist)

```
After processReport completes:
  ↓
Fetch created results from DB (with relationships)
  ↓
testAnalysisService.analyzeStoredResults(results[])
  ↓
Update result records with analysis fields
  ↓
Return: { ...previous, analysis: [...] }
```

## Implementation Steps

### Step 1: Add New Service Method

**File**: `src/services/testAnalysisService.ts`

Create new method that accepts DB result records instead of raw CTRF:

```typescript
async analyzeStoredResults(
  results: PrismaResult[] // with spec, execution, errors relations
): Promise<Map<string, TestResultAnalysis>>
```

**Key differences from current `analyzeCtrfTestResults()`:**

- Input: DB records with real IDs
- Output: Map of `resultId → analysis` (not workerIndex-based)
- Can include more context (spec.key, execution.name, etc.)

### Step 2: Modify ctrfService.processReport()

**File**: `src/services/ctrfService.ts`

```typescript
async processReport(ctrfReport, options) {
  // 1. Transform WITHOUT analysis
  const reportData = this.transformCtrfToReportData(ctrfReport);

  // 2. Persist to DB (no analysis field)
  const result = await jsonReportService.processReport({
    ...reportData,
    provider: "ctrf",
  }, projectId);

  // 3. FETCH just-created results from DB
  const createdResults = await dbClient.result.findMany({
    where: { executionId: result.executionId },
    include: {
      spec: true,
      execution: true,
      errors: true
    }
  });

  // 4. Analyze stored results (POST-PERSIST)
  let analysisMap = null;
  try {
    analysisMap = await testAnalysisService.analyzeStoredResults(createdResults);

    // 5. Update results with analysis
    for (const [resultId, analysis] of analysisMap.entries()) {
      await dbClient.result.update({
        where: { id: resultId },
        data: {
          analysisStatus: analysis.status,
          analysisCategory: analysis.category,
          analysisConfidence: analysis.confidence,
          analysisConclusion: analysis.conclusion,
        }
      });
    }
  } catch (error) {
    logger.warn("Analysis failed, results saved without analysis", error);
  }

  return {
    ...result,
    analysis: analysisMap ? Array.from(analysisMap.values()) : undefined
  };
}
```

### Step 3: Update jsonReportService

**File**: `src/services/jsonReportService.ts`

Remove analysis matching logic (lines 268-270) for CTRF reports:

- Keep analysis support for legacy Playwright JSON
- CTRF reports will have `analysis: undefined` during initial persist
- Analysis added via separate update after

**Option A**: Check provider type

```typescript
if (provider !== "ctrf" && analysis) {
  // Old workerIndex-based matching for Playwright
  const resultAnalysis = analysis.find(
    (a) => a.workerIndex === result.workerIndex,
  );
}
```

**Option B**: If analysis array is empty, skip matching entirely

```typescript
const resultAnalysis = analysis?.find(
  (a) => a.workerIndex === result.workerIndex,
);
// Will be undefined for CTRF, proceed without analysis
```

### Step 4: Update Return Type

**File**: `src/services/ctrfService.ts`

```typescript
interface CTRFProcessResult extends ProcessReportResult {
  analysis?: TestResultAnalysis[];
}
```

## Benefits

### 1. Robust Matching

- Uses `result.id` (DB primary key) instead of `workerIndex`
- No collision possible

### 2. Decoupled Upload/Analysis

- Upload succeeds even if analysis fails
- Can retry analysis independently
- Results persisted immediately

### 3. Better Analysis Context

- Access to full DB relationships
- Can include spec.key, execution.name in prompt
- Can reference existing errors table data

### 4. CTRF-Specific

- No impact on existing Playwright JSON flow
- Isolated risk/testing scope

## Migration Path

### Phase 1: Implement for CTRF only

- Keep Playwright flow unchanged
- Test with CTRF uploads

### Phase 2 (Future): Migrate Playwright

- Apply same pattern to `jsonReportController`
- Remove `workerIndex` matching entirely

## Testing Strategy

1. **Unit Tests**: New `analyzeStoredResults()` method
2. **Integration Tests**:
   - CTRF upload with successful analysis
   - CTRF upload with analysis failure (verify results still saved)
   - Verify analysis fields updated correctly
3. **Regression Tests**: Verify Playwright JSON flow unchanged

## Rollback Plan

- Keep old code path via feature flag
- If analysis-last fails, fall back to analysis-first
- Monitor error rates post-deployment

## Files to Modify

1. `src/services/testAnalysisService.ts` - Add `analyzeStoredResults()`
2. `src/services/ctrfService.ts` - Refactor `processReport()`
3. `src/services/jsonReportService.ts` - Optional: skip analysis for CTRF
4. Tests: Add coverage for new flow

## Estimated Effort

- Development: 4-6 hours
- Testing: 2-3 hours
- Review/Deploy: 1-2 hours

**Total**: ~1 day
