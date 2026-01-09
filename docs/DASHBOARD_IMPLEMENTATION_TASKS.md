# Dashboard Implementation Tasks

## Phase 1: Database & Schema

- [ ] **1.1. Modeling**: Update `prisma/schema.prisma`.
  - Add `ProjectMeta` model with `projectId`, `key`, `value` (Json), `updatedAt`.
  - Define unique constraint on `[projectId, key]`.
- [ ] **1.2. Migration**: Create and run the migration.
  - `npx prisma migrate dev --name add_project_meta`
- [ ] **1.3. Generation**: Regenerate Prisma client.
  - `npm run db:generate`

## Phase 2: Core Logic (DashboardService)

- [ ] **2.1. Type Definitions**: Create `src/types/dashboard.ts`.
  - Define `DailyMetrics` (total, passed, failed, duration).
  - Define `IssueMetrics` (bug, env, script, etc.).
  - Define `DashboardStorage` (the JSON structure stored in DB).
  - Define `DashboardResponse` (the API response structure).
- [ ] **2.2. Write Logic**: Implement `src/services/dashboardService.ts` -> `updateStats`.
  - Input: `projectId`, `executionId`.
  - Logic:
    1. Fetch full execution details including `Result` and `ResultError`.
    2. Calculate metrics for this execution.
    3. Fetch `ProjectMeta` for the environment.
    4. Upsert the stats into the JSON structure for the specific date.
    5. Save back to DB.
- [ ] **2.3. Read Logic**: Implement `src/services/dashboardService.ts` -> `getDashboard`.
  - Input: `projectId`, `environment`, `period` (enum), `type` (optional).
  - Logic:
    1. Fetch `ProjectMeta`.
    2. Filter JSON keys based on `period` (date range).
    3. Filter based on `type` if provided.
    4. Aggregate daily totals for the "Summary" block.
    5. Fetch last 10 executions from DB for "Recent Activity".
    6. Return combined object.

## Phase 3: Integration & Events

- [ ] **3.1. Hooks**: Identify where execution finishes.
  - Likely in `JsonReportService` or `CtrfService` after processing a report.
  - Add call to `DashboardService.updateStats`.
- [ ] **3.2. Backfill Script**: Create a script to populate data for existing executions.
  - Loop through all past executions.
  - Call `updateStats` for each.

## Phase 4: API Layer

- [ ] **4.1. Controller**: Create `src/controllers/dashboardController.ts`.
  - `getDashboard`: Parse query params (`period=30d`, `env=Dev`), validation (Zod), call service.
- [ ] **4.2. Routes**: Register route in `src/routes/project.ts` (or new file).
  - `GET /api/projects/:projectId/dashboard`
  - Add authentication middleware.

## Phase 5: Testing

- [ ] **5.1. Unit Tests**: `__tests__/services/dashboardService.test.ts`.
  - Test aggregation math.
  - Test date filtering logic.
  - Test empty state.
- [ ] **5.2. Integration Tests**: `__tests__/routes/dashboard.test.ts`.
  - Test full API flow.
