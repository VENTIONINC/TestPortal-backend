# Manual Test Runs API

Import `Manual_Test_Runs_API.postman_collection.json` together with the Test
Portal environment. Set `baseUrl`, `accessToken`, `projectId`, `scenarioId`,
and, after starting a run, `runId` and `stepId`.

The collection covers starting a snapshot, listing project/scenario history,
retrieving a run, updating a copied step, updating run notes/status, and
completing a run. Manual runs are independent of automated Results. A run
cannot be edited after completion; a passing run must have at least one passed
step and no unfinished, failed, or blocked steps.
