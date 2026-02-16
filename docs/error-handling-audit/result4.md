Result 4: models/Prisma layer

Checked:

- [src/models/assumptionModel.ts](src/models/assumptionModel.ts)
- [src/models/executionModel.ts](src/models/executionModel.ts)
- [src/models/issueModel.ts](src/models/issueModel.ts)
- [src/models/projectModel.ts](src/models/projectModel.ts)
- [src/models/resultModel.ts](src/models/resultModel.ts)
- [src/models/resultErrorModel.ts](src/models/resultErrorModel.ts)
- [src/models/specModel.ts](src/models/specModel.ts)
- [src/models/uploadApiKeyModel.ts](src/models/uploadApiKeyModel.ts)
- [src/models/userModel.ts](src/models/userModel.ts)

Findings:

- Cascade delete paths validate existence and throw explicit not-found errors in `executionModel`, `specModel`, `issueModel`, `resultModel`, `projectModel`. [executionModel](src/models/executionModel.ts#L56-L107), [specModel](src/models/specModel.ts#L33-L65), [issueModel](src/models/issueModel.ts#L124-L155), [resultModel](src/models/resultModel.ts#L574-L618), [projectModel](src/models/projectModel.ts#L172-L276)
- `resultErrorModel.assignIssue` relies on Prisma update error for missing IDs; no explicit not-found check (throws Prisma error). [resultErrorModel](src/models/resultErrorModel.ts#L28-L48)
- `assumptionModel.update/delete` and `userModel.update` do not check existence; missing ID errors bubble from Prisma. [assumptionModel](src/models/assumptionModel.ts#L15-L29), [userModel](src/models/userModel.ts#L42-L62)
- No unhandled async errors observed in model layer; errors propagate via Prisma exceptions.
