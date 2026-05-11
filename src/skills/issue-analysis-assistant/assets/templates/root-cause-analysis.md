# Root-Cause Analysis Template

Use this template for recurring failure analysis, issue matching, or a single complex error investigation.

## Scope

- Analysis request:
- Time range:
- Environment scope:
- Result/error IDs:
- Related issues:
- Related assumptions:
- Data sources:

## Pattern Summary

State the dominant pattern in 1-3 sentences. Avoid declaring a confirmed cause unless the evidence proves it.

## Failure Cluster

| Cluster | Count | Error signature | Affected specs | Environments | First seen | Latest seen |
| --- | ---: | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

## Similarity Analysis

| Candidate issue/assumption | Match signals | Contradicting signals | Confidence |
| --- | --- | --- | --- |
|  |  |  | High/Medium/Low |

## Root-Cause Hypotheses

| Hypothesis | Evidence for | Evidence against | Validation step | Confidence |
| --- | --- | --- | --- | --- |
|  |  |  |  | High/Medium/Low |

## Recommendation

- Link to existing issue:
- Create new issue:
- Assumption action: confirm, delete_as_incorrect, or needs_more_evidence
- Collect more data:
- Immediate mitigation:

## Structured Payload

```json
{
  "scope": "",
  "clusters": [],
  "candidateLinks": [],
  "hypotheses": [],
  "recommendation": {
    "action": "collect_more_data",
    "targetIssueId": null,
    "targetAssumptionId": null,
    "assumptionAction": null,
    "reason": ""
  },
  "confidence": "medium",
  "dataGaps": []
}
```
