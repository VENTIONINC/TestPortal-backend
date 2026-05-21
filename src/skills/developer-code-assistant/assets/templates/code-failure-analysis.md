# Code Failure Analysis Template

Use this template when analyzing a test failure, stack trace, result ID, or result error ID that points to source-code behavior.

## Issue Summary

- Result ID:
- Result error ID:
- Failing spec/test:
- Source location:
- Error:
- Impact:

## Root Cause

Explain the underlying code behavior that produced the failure. Separate confirmed facts from hypotheses.

## Evidence

- Error message:
- Stack trace excerpt:
- Relevant code path:
- Inputs/state at failure:
- Related issue or assumption:

## Code Fix

### Before

```typescript
// Problematic code
```

### After

```typescript
// Proposed fix
```

## Prevention

- Defensive checks:
- Type-safety improvement:
- Error handling:
- Related code patterns to inspect:

## Testing

- Unit tests:
- Integration tests:
- Regression scenario:
- Manual verification:

