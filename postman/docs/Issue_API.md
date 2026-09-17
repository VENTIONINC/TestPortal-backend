# Issue API

All supported Issue endpoints are authenticated V2 routes. Every Issue belongs
to the supplied `projectId` and uses one required lowercase category:
`bug`, `infra`, `performance`, `script`, or `other`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v2/issues?projectId={projectId}&category=bug` | List Issues; `category` filters persisted Issue state. |
| GET | `/api/v2/issues/with-stats?projectId={projectId}` | List Issues with statistics; optional `statFrom`, `statTo`, and `type` scope both stats and summaries. |
| GET | `/api/v2/issues/{issueId}?projectId={projectId}` | Get one Issue. |
| POST | `/api/v2/issues` | Create an Issue with a required lowercase category. |
| PATCH | `/api/v2/issues/{issueId}` | Update Issue fields, including category. |
| DELETE | `/api/v2/issues/{issueId}?projectId={projectId}` | Delete an Issue and its assumptions. |

## Example: create an Issue

```json
{
  "projectId": "{{projectId}}",
  "name": "Database timeout",
  "category": "infra",
  "description": "Connections time out during the nightly run"
}
```

Issue read responses include the persisted `category` and `categorySummary`:

```json
{
  "id": "{{issueId}}",
  "name": "Database timeout",
  "category": "infra",
  "categorySummary": {
    "displayCategory": "infra",
    "isMixed": true,
    "distribution": {"bug": 1, "infra": 2, "performance": 0, "script": 0, "other": 0},
    "uncategorizedCount": 1
  }
}
```

The summary's `displayCategory` is the Issue category. Its Result-based values
use `analysisFeedbackCategory ?? analysisCategory`, include all assumptions,
deduplicate repeated Result links, and count invalid or missing Result categories
as uncategorized.

## Assign Issue modal endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v2/result-errors/{resultErrorId}/modal-context?projectId={projectId}` | Read modal context and assignment categories. |
| POST | `/api/v2/result-errors/{resultErrorId}/issue` | Atomically create an Issue, confirm its assumption, and update Result feedback. |
| PATCH | `/api/v2/result-errors/{resultErrorId}/issue` | Atomically edit the confirmed Issue and its containing Result feedback. |

Both write bodies require `projectId` and lowercase `category`. These REST
operations are not currently exposed as MCP tools. They refresh the relevant
Dashboard metrics. An edit affects only the Result containing the confirmed
assignment, not all historical Results linked to the Issue.
