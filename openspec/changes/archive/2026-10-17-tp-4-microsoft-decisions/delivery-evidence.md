# Delivery Evidence

## Mocked and repository checks

- Focused OpenRouter adapter and evaluation tests: 2 suites, 103 tests passed.
- Credential-free Jest checks: the Microsoft, existing OpenRouter, and TypeSafe projects each selected their own two files and skipped both tests with blank provider credentials.
- Jest `--listTests` showed separate Microsoft, OpenRouter, TypeSafe, and generative stored-results selections. The generative project selected only its existing smoke and regression files; its credential-free execution still fails at the existing `OPENAI_API_KEY` import guard.
- `npm run type-check`: passed.
- `npm run lint`: passed with two existing `no-explicit-any` warnings in `__tests__/services/dashboardService.aggregation.test.ts`.
- `npm test -- --runInBand`: 74 suites and 608 tests passed. These ordinary tests do not select live prompt provider suites.
- `npm run build`: passed.
- `openspec validate tp-4-microsoft-decisions --strict`: passed.
- `git diff --check`: passed.
- Generated dataset and report paths were confirmed ignored by Git.
- No production REST, MCP, database, or direct-provider implementation files changed.

## Live research

Live evaluations ran on October 17, 2026 (Europe/Bratislava) through OpenRouter alpha Decisions, using shared datasets and policy, concurrency 8, a 30-second per-attempt timeout, and zero automatic retries.

| Suite | Requested model | Accuracy | Median request latency | Reported cost |
| --- | --- | --- | --- | --- |
| smoke | `typesafe/jev-1.13` | 4/4 (100%) | 281.5 ms | $0.000100296 |
| regression | `typesafe/jev-1.13` | 40/40 (100%) | 357 ms | $0.000999432 |
| smoke | `openai/gpt-6-luna-decisions` | 4/4 (100%) | 195 ms | $0.000131500 |
| regression | `openai/gpt-6-luna-decisions` | 40/40 (100%) | 177 ms | $0.001306200 |
| smoke | `microsoft/microsoft-decision-1` | 4/4 (100%) | 390.5 ms | $0.000041244 |
| regression | `microsoft/microsoft-decision-1` | 40/40 (100%) | 330.5 ms | $0.000408660 |

All three profiles reached equal observed accuracy. OpenAI had the lowest median latency; Microsoft had the lowest reported cost in both suites. Jev regression passed on a user-requested rerun after the initial run failed probability-normalization validation. Costs above cover completed runs only; failed-run cost is unavailable.

Latencies include OpenRouter gateway and routing time. Total-token usage was unavailable. The baseline has no performance-category examples, and these individual runs do not establish broader model quality.

### Exact local report provenance

- jev / smoke: evaluated `2026-10-16T22:46:26.472Z`; returned `typesafe/jev-1.13-20260917`; report `__prompts-tests__/stored-results-analysis/reports/openrouter/jev/smoke/2026-10-16T22-46-26-472Z-07e25374-b20c-42a0-afe6-57b90eb16bfb.json`.
- jev / regression: evaluated `2026-10-16T22:47:30.291Z`; returned `typesafe/jev-1.13-20260917`; report `__prompts-tests__/stored-results-analysis/reports/openrouter/jev/regression/2026-10-16T22-47-30-291Z-f3989f60-0ff6-42cd-8831-c303922d1047.json`.
- openai / smoke: evaluated `2026-10-16T22:46:30.560Z`; returned `openai/gpt-6-luna-decisions-20261006`; report `__prompts-tests__/stored-results-analysis/reports/openrouter/openai/smoke/2026-10-16T22-46-30-560Z-171114eb-5e88-4ff4-bb0e-a2fd22a67f55.json`.
- openai / regression: evaluated `2026-10-16T22:46:30.284Z`; returned `openai/gpt-6-luna-decisions-20261006`; report `__prompts-tests__/stored-results-analysis/reports/openrouter/openai/regression/2026-10-16T22-46-30-284Z-a93c8801-cc08-4799-8285-02a411a9aeaf.json`.
- microsoft / smoke: evaluated `2026-10-16T22:46:36.122Z`; returned `microsoft/microsoft-decision-1-20261009`; report `__prompts-tests__/stored-results-analysis/reports/openrouter/microsoft/smoke/2026-10-16T22-46-36-122Z-800d849a-a3d8-4173-87a7-f1e34960a5cc.json`.
- microsoft / regression: evaluated `2026-10-16T22:46:35.671Z`; returned `microsoft/microsoft-decision-1-20261009`; report `__prompts-tests__/stored-results-analysis/reports/openrouter/microsoft/regression/2026-10-16T22-46-35-671Z-adce01d2-067b-4326-b045-364d8c5db274.json`.

The repository comparison tool successfully validated the smoke and regression triples against matching dataset fingerprints, policy versions, and case identities. Collected summaries, comparison output, and the original failure log are under the ignored local directory `__prompts-tests__/stored-results-analysis/reports/experiment-2026-10-17/`. No historical latest report was substituted for a failed run. Generated reports remain local and are not committed.
