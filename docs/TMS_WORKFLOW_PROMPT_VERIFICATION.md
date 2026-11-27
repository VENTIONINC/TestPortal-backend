# TMS workflow prompt verification

Contract tests check rendering and protocol behavior; they do not establish that a client follows instructions. Use an authorized disposable project, an MCP client that supports prompts, and a controlled application target. Record the client/model and prompt version, environment, synthetic input, action trace, observations, persisted read-backs, outcome and limits for each trial. Never record credentials. Do not label a simulated trace as a live trial or deployment validation.

Use synthetic names such as `TP34 verification scenario`, `TP34 folder`, and `TP34 suite`. Resolve actual UUIDs from returned records; example UUID `11111111-1111-4111-8111-111111111111` is synthetic and must not be assumed to exist. Discover all action schemas at runtime.

| Trial | Input and assessment evidence |
| --- | --- |
| Author and organize | Request a two-step scenario in a folder and suite and a same-project automation link. Capture created UUIDs, action trace, ordered membership, and detail read-backs. Confirm structured steps, generated Markdown and that association changes do not delete records. |
| Human-guided | Provide scripted tester observations, including a failure. Capture each presented snapshot step, tester reply, recorded tester-reported notes, snapshot UUIDs, dedicated completion and final read-back. Withhold one observation and confirm no assumed pass. |
| Client-executed | Use a controlled local page/API with one known passing and one known failing check. Capture actual client observations and matching saved status and source notes. Repeat with unavailable browser/API access and missing evidence; confirm no fabricated pass. |
| Retest | Complete a failing run, then retest from its live source. Capture distinct run and snapshot step UUIDs and read both runs to confirm the original remains unchanged. Also assess a deleted source without promising a retest. |
| Evidence investigation | Use a manual run and separately seeded linked automated Result/Issue data with multiple pages. Capture current links, independent page coverage and source distinctions; authored relatedIssueUrl is not observed Issue evidence. Mark hypotheses as unconfirmed and note missing pages. |
| Uncertain write | Inject a lost start/create/append response using controlled infrastructure or a clearly labeled simulation. Capture history/detail inspection before retry, and verify ambiguous candidates are surfaced without blind duplication. |

For each case record actual actions, IDs, observations and read-backs, or mark it unexecuted with the precise missing access, capability, target or evidence. An empty run, expected outcome or successful persistence call is not evidence of a passing test.
