# Environment Request Usage Inventory

This inventory covers production request code, API schemas, and database-query
construction in `TestPortal-backend` and `TestPortal-client`. Tests, generated
package internals, prose-only assistant prompts, and historical migrations are
excluded unless they expose a useful compatibility or hard-coded-value example.

## Dashboard and PDF removal

Dashboard and Dashboard PDF environment inputs are removed, not retained and
ignored within the supported production flow.

| Repository | File / flow | Endpoint or service | Sends environment | Validates environment | Filters the database by environment | Hard-coded `staging` |
| --- | --- | --- | --- | --- | --- | --- |
| Client | `src/components/dashboard/containers/index.tsx` | Dashboard query and PDF export caller | No | No | No | No |
| Client | `src/components/dashboard/components/ProductQualityWidget/index.tsx` | Additional Dashboard query | No | No | No | No |
| Client | `src/redux/apis/generatedApi.ts` | `GET /api/v2/projects/{projectId}/dashboard` | No; the generated argument and serializer contain only project, period, type, and granularity | No | No | No |
| Client | `src/redux/apis/generatedApi.ts`, `src/redux/apis/extendedApi.ts` | `POST /api/v2/reports/pdf-export` | No; `PdfExportRequest` and the custom mutation body have no environment field | No | No | No |
| Backend | `src/controllers/dashboardController.ts`, `src/lib/openapi/projects.ts` | `GET /api/v2/projects/:projectId/dashboard` | N/A | No; environment is absent from parsing and OpenAPI | No | No |
| Backend | `src/schemas/reportExportSchemas.ts`, `src/types/dashboard.ts`, `src/lib/openapi/pdfExport.ts`, `src/controllers/reportController.ts` | `POST /api/v2/reports/pdf-export` | N/A | No; environment is absent from runtime schema, type, OpenAPI schema/example, and filename construction | No | No |
| Backend | `src/services/reportService.ts` | `reportService.generatePdf` | No; it calls `dashboardService.getDashboard` without environment | N/A | No | No |
| Backend | `src/services/dashboardService.ts` | `dashboardService.getDashboard` | N/A | N/A | No; both `DailyExecutionMetricWhereInput` and `ExecutionWhereInput` use project/date plus optional type only | No |

The Dashboard response intentionally still exposes `recentExecutions[].environment`
from `src/services/dashboardService.ts`, `src/types/dashboard.ts`, and
`src/lib/openapi/projects.ts`. This is descriptive metadata for each execution,
not a request or database filter. Likewise, `history[].metrics.issues.environment`
is an issue-category count, not an execution-environment selector.

Express may accept an unknown legacy Dashboard query parameter and Zod objects
strip unknown PDF body fields by default, but no supported client request,
runtime schema, OpenAPI contract, service argument, or Dashboard Prisma `where`
object carries environment.

## Active HTTP environment filters and URLs

| Repository | File / flow | Endpoint or service | Behavior | Hard-coded `staging` |
| --- | --- | --- | --- | --- |
| Backend | `src/lib/params-builder.ts`, `src/controllers/resultController.ts`, `src/types/api.ts`, `src/lib/openapi/results.ts` | `GET /api/v2/results` | Reads and documents optional `environment`, then forwards it to `resultService`. It is accepted as a string; there is no fixed-environment allow-list. | No |
| Backend | `src/mcp/schemas/resultSchemas.ts`, `src/handlers/mcpResultHandler.ts` | MCP `get_results` | Validates an optional string and forwards it to the shared Results service. | No |
| Client | `src/hooks/useFilterQueryParams.ts`, `src/hooks/useFiltersWithUrl.ts`, `src/components/results/hooks/useResultsEffectiveFilters.ts`, `src/components/results/hooks/useResultsData.ts`, `src/types/apis/resultsApi.ts`, `src/redux/apis/extendedApi.ts` | `GET /api/v2/results` | An `environment` value supplied in the Results URL (for example, `/results?environment=staging`) is merged into effective filters and sent by the active Results query. The current filter panel has no visible environment control, but the URL path is production-reachable; empty values are omitted by the request serializer. | No |
| Client | `src/redux/apis/generatedApi.ts` | `GET /api/v2/results` | The generated request type and serializer retain optional `environment` because the backend REST contract and active Results URL flow support it. | No |
| Client | `src/components/results/components/ExecutionCard/helpers.ts`, `src/components/results/components/ExecutionCard/integration-links.tsx`, `src/components/results/components/ExecutionCard/results-execution-card.tsx` | External Monitoring link from a Results execution card | Builds an active external browser URL when the monitoring integration is enabled. `URLSearchParams` receives a `query` value of `env:${env}` (serialized as an encoded `query=env:<execution environment>` value) plus the result time range. The environment comes from execution response metadata; this is an external monitoring query, not a Test Portal API or Prisma filter. | No |

`src/redux/apis/issuesApi.ts` can append an `environment` query value to
`GET /api/v2/issues`, but its UI control is disabled and the backend issue
controllers, parameter builder, service, model, and OpenAPI contract do not read
or apply that value. It is therefore dormant client-side contract residue, not
an active HTTP/DB environment filter.

## Active Prisma and database filtering

| Repository | File / service | Query behavior | Request reachability | Hard-coded `staging` |
| --- | --- | --- | --- | --- |
| Backend | `src/services/resultService.ts`, `src/models/resultModel.ts` | Copies an optional Results environment filter into `Prisma.ExecutionWhereInput.environment`; the resulting clause is shared by result list, count, and available-tag queries. | Active from REST `GET /api/v2/results` and MCP `get_results`. | No |
| Backend | `src/services/executionService.ts`, `src/models/executionModel.ts` | `getExecutions`/`findMany` can apply `where.environment`. | No production REST route or MCP handler calls these list methods today; only get-by-id and delete execution routes are mounted. | No |
| Backend | `prisma/schema.prisma` | `Execution.environment` stores execution metadata and has a project/environment index. `DailyExecutionMetric.environment` remains part of its per-environment aggregation key. | Persistence and aggregation structure; neither field implies a Dashboard request filter. | No |

`dashboardService.updateStats` and `refreshDailyStats` continue to write one
`DailyExecutionMetric` row per project/environment/type/date. Dashboard reads now
sum every matching environment row rather than selecting one environment.

## Upload and descriptive metadata

| Repository | File / flow | Endpoint or service | Behavior | Hard-coded `staging` |
| --- | --- | --- | --- | --- |
| Backend | `src/lib/openapi/reports.ts`, `src/controllers/jsonReportController.ts`, `src/services/jsonReportService.ts` | `POST /api/v2/upload-json-report` and `/upload-json-report-api-key` | Playwright-style report `config.env`/normalized `env` is execution metadata and is persisted as `Execution.environment`; it is not a read filter. Raw reports missing `config.env` receive a default. | **Yes:** raw report transformation defaults missing `config.env` to `"staging"`. |
| Backend | `src/lib/openapi/ctrf.ts`, `src/mcp/schemas/ctrfSchemas.ts`, `src/types/ctrf.ts`, `src/services/ctrfService.ts` | CTRF upload schemas and transformation | Accepts descriptive `results.environment.testEnvironment`; it becomes normalized execution `env`, defaulting to `"N/A"` when absent. | No runtime default; schema descriptions use `staging` only as an example. |
| Backend | `src/services/dashboardService.ts`, `src/services/errorFormatterService.ts`, `src/services/resultErrorService.ts`, `src/services/resultService.ts` | Dashboard response, analysis/error context, and analysis export | Reads and emits execution environment as descriptive context or output metadata. | No |

## Issue category and process configuration uses

- `environment` in `DashboardIssueMetrics`, chart rendering, PDF failure-cause
  aggregation, and `issuesEnvironment` database fields is an analysis category
  label/count. It does not filter by `Execution.environment`. The current formal
  issue enum uses `Infra`; compatibility logic still maps legacy analysis category
  `environment` into the infrastructure/environment metric.
- Client issue/result category colors, labels, and charts are presentation of
  that category, not request filtering.
- `src/config/environment.ts` and its consumers use "environment" in the process
  configuration sense (`process.env`, auth/Cognito/LangSmith/version settings).
  These values are unrelated to test-execution environment filters.
- MCP environment/performance assistant prompt scope is natural-language prompt
  context. It does not construct an HTTP or Prisma filter by itself.

## Hard-coded `staging` and compatibility examples

Two hard-coded `staging` literals participate in production runtime behavior:

- Backend `src/controllers/jsonReportController.ts` sets a missing raw
  Playwright report `config.env` to `"staging"`. This is the **only production
  runtime default/fallback**; it affects stored execution metadata, not
  Dashboard selection.
- Client `src/pages/ReportGenerator/constants.ts` includes `staging` in the
  environment options consumed by `generateProductionLikeName` in
  `src/pages/ReportGenerator/helpers.ts`. This is a selectable production
  example/mock value used on the authenticated, project-guarded
  `/report-generator` route. It can appear in generated report content, links,
  and download names, but it is not an automatic environment fallback or a
  Dashboard/PDF request/database filter.

There is no production `DEFAULT_ENVIRONMENT` constant or
`environment=staging` request remaining in either repository.

Other examples and compatibility artifacts worth tracking separately:

- The currently unreferenced client Dashboard mock-data generator includes
  `staging` among synthetic execution metadata values.
- Backend OpenAPI/MCP CTRF descriptions mention `staging` as an example value.

The first-party Dashboard architecture/data-plan documents, PDF AI-insights
specification, Postman PDF example, and client dashboard-status specification
now describe the current all-environment Dashboard/PDF behavior. Their remaining
environment mentions refer only to stored execution metadata, descriptive output,
or the issue category—not request inputs or read predicates.
