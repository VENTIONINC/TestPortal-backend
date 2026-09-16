# CTRF diagnostic rollout

## Deployment order

Deploy the additive backend reader first. It accepts the versioned
`extra.testPortal` extension, standard CTRF diagnostic and retry fields, and
the existing legacy test-level `meta` representation. Release the CLI producer
only after that backend version is available.

To roll back, revert the CLI producer first and leave the additive backend
reader deployed. If the backend must also be rolled back, conformant reports
remain readable for their standard CTRF fields, while older backend versions
ignore the new `extra` diagnostics.

The CLI stores TestPortal diagnostic enrichment only in
`extra.testPortal.errors`; `rawLogs`, `sourceSnippet`, and
`generatedTestCase` are not duplicated into `tests[]`.

Legacy `meta.logs`, `meta.sourceSnippet`, and `meta.generatedTestCase` reads
remain supported indefinitely. Removing them requires a separate deprecation
proposal with usage evidence and a migration window.

## Shared-contract packaging decision

The backend and CLI remain independently versioned repositories without a
shared fixture directory. Cross-repository contract packaging is deferred; a
future shared package or fixture set should be proposed separately if the
normalization contract expands to more producers.
