# Assumption Review Template

Use this template when evaluating whether an assumption is supported by evidence and whether it should be confirmed, deleted as incorrect, or left unresolved until more evidence exists.

## Assumption

- Assumption ID:
- Linked issue:
- Linked result error:
- Made by:
- Created at:
- Current isConfirmed value:
- Current score:

## Evidence Review

| Evidence | Supports assumption? | Notes |
| --- | --- | --- |
| Error message match | Yes/No/Partial |  |
| Stack trace match | Yes/No/Partial |  |
| Environment match | Yes/No/Partial |  |
| Spec/test context match | Yes/No/Partial |  |
| Historical recurrence | Yes/No/Partial |  |
| Resolution behavior | Yes/No/Partial |  |

## Quality Assessment

- Evidence strength: High | Medium | Low
- Contradicting evidence:
- Missing data:
- Risk of false linkage:
- Confidence: High | Medium | Low

## Decision

- Recommended action: confirm | delete_as_incorrect | needs_more_evidence
- Rationale:
- Required follow-up:

## Structured Payload

```json
{
  "assumptionId": "",
  "recommendedAction": "needs_more_evidence",
  "confidence": "medium",
  "supportingEvidence": [],
  "contradictingEvidence": [],
  "missingData": [],
  "followUpActions": []
}
```
