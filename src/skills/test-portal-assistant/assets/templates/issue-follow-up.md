# Issue Follow-Up Template

Use this template when converting one or more test failures into an issue-tracking handoff.

## Title

[Component or feature]: [short failure summary]

## Problem Summary

Describe what failed, where it failed, and why it matters.

## Evidence

- Result IDs:
- Result error IDs:
- Execution IDs:
- Affected specs/tests:
- Error signatures:
- Stack trace excerpts:
- Screenshots/logs:
- First seen:
- Latest seen:

## Impact

- User or business impact:
- Test-suite impact:
- Environments affected:
- Frequency:
- Severity recommendation:

## Analysis

- Likely category: Bug | Script | Infra | Performance | Other
- Related issues or assumptions:
- Similar failures:
- Confidence: High | Medium | Low
- Reason for confidence:

## Recommended Action

- Immediate action:
- Validation steps:
- Regression checks to add or update:

## Structured Payload

```json
{
  "title": "",
  "summary": "",
  "resultIds": [],
  "resultErrorIds": [],
  "executionIds": [],
  "affectedSpecs": [],
  "errorSignatures": [],
  "environment": "",
  "impact": "",
  "likelyCategory": "Other",
  "severity": "medium",
  "confidence": "medium",
  "recommendedAction": "",
  "validationSteps": []
}
```
