Result 2: controllers

Checked:

- [src/controllers/assumptionController.ts](src/controllers/assumptionController.ts)
- [src/controllers/ctrfController.ts](src/controllers/ctrfController.ts)
- [src/controllers/errorFormatterController.ts](src/controllers/errorFormatterController.ts)
- [src/controllers/executionController.ts](src/controllers/executionController.ts)
- [src/controllers/issueController.ts](src/controllers/issueController.ts)
- [src/controllers/jsonReportController.ts](src/controllers/jsonReportController.ts)
- [src/controllers/projectController.ts](src/controllers/projectController.ts)
- [src/controllers/promptController.ts](src/controllers/promptController.ts)
- [src/controllers/resultController.ts](src/controllers/resultController.ts)
- [src/controllers/resultErrorController.ts](src/controllers/resultErrorController.ts)
- [src/controllers/specController.ts](src/controllers/specController.ts)
- [src/controllers/uploadApiKeyController.ts](src/controllers/uploadApiKeyController.ts)
- [src/controllers/userController.ts](src/controllers/userController.ts)

Findings:

- All handlers wrap logic in `try/catch`; no unhandled async errors observed in controllers.
- Error classification inconsistent: some catch blocks return 400 for all failures, potentially masking server faults. Examples: [assumptionController](src/controllers/assumptionController.ts#L20-L61), [resultErrorController](src/controllers/resultErrorController.ts#L37-L84), [resultController](src/controllers/resultController.ts#L145-L149).
- `jsonReportController` swallows analysis failures (logs and continues with success response), so analysis errors are not surfaced to clients. [jsonReportController](src/controllers/jsonReportController.ts#L95-L129)
