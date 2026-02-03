Result 3: services

Checked:

- [src/services/assumptionService.ts](src/services/assumptionService.ts)
- [src/services/authService.ts](src/services/authService.ts)
- [src/services/ctrfService.ts](src/services/ctrfService.ts)
- [src/services/errorFormatterService.ts](src/services/errorFormatterService.ts)
- [src/services/executionService.ts](src/services/executionService.ts)
- [src/services/issueService.ts](src/services/issueService.ts)
- [src/services/jsonReportService.ts](src/services/jsonReportService.ts)
- [src/services/jwtService.ts](src/services/jwtService.ts)
- [src/services/projectService.ts](src/services/projectService.ts)
- [src/services/promptParameterService.ts](src/services/promptParameterService.ts)
- [src/services/resultErrorService.ts](src/services/resultErrorService.ts)
- [src/services/resultService.ts](src/services/resultService.ts)
- [src/services/specService.ts](src/services/specService.ts)
- [src/services/testAnalysisService.ts](src/services/testAnalysisService.ts)
- [src/services/uploadApiKeyService.ts](src/services/uploadApiKeyService.ts)
- [src/services/userService.ts](src/services/userService.ts)

Findings:

- Services generally validate inputs and throw errors; no silent failures in core CRUD flows.
- `resultService` swallows JSON parse errors for stored data and continues (warn-only). [src/services/resultService.ts](src/services/resultService.ts#L61-L97)
- `ctrfService` swallows analysis failures and continues with success response (analysis omitted). [src/services/ctrfService.ts](src/services/ctrfService.ts#L77-L113)
- `errorFormatterService` converts upstream errors to a generic message (loses original detail). [src/services/errorFormatterService.ts](src/services/errorFormatterService.ts#L45-L48)
- `jwtService` throws at module load if `JWT_SECRET` missing (startup hard-fail). [src/services/jwtService.ts](src/services/jwtService.ts#L27-L33)
- `testAnalysisService` logs and rethrows upstream errors (propagates). [src/services/testAnalysisService.ts](src/services/testAnalysisService.ts#L151-L154)
