# Performance Regression Template

Use this template when Test Portal execution duration or externally supplied performance telemetry appears degraded.

## Scope

- Metric:
- Time range:
- Baseline:
- Environment:
- Affected executions/specs:
- External telemetry supplied: Yes | No

## Regression Summary

State whether a regression is confirmed, likely, possible, or not supported by the data.

## Metric Comparison

| Metric | Current | Baseline | Delta | Sample size |
| --- | ---: | ---: | ---: | ---: |
| Average duration |  |  |  |  |
| Median duration |  |  |  |  |
| P95 duration |  |  |  |  |
| P99 duration |  |  |  |  |
| Timeout count |  |  |  |  |

## Outliers and Clusters

| Cluster/test | Current duration | Baseline duration | Delta | Evidence |
| --- | ---: | ---: | ---: | --- |
|  |  |  |  |  |

## Likely Drivers

- Code/product change:
- Environment/infrastructure change, if supported by external context:
- Data volume change:
- Parallelization/resource contention, if supported by external context:
- Unknowns:

## Recommendation

- Immediate mitigation:
- Investigation steps:
- Monitoring threshold:
- Regression test or alert to add:

## Structured Payload

```json
{
  "metric": "",
  "environment": "",
  "isRegressionSupported": false,
  "confidence": "medium",
  "currentWindow": "",
  "baselineWindow": "",
  "comparisons": [],
  "affectedTests": [],
  "likelyDrivers": [],
  "recommendedActions": []
}
```
