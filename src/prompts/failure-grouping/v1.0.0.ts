export const getFailureGroupingPrompt = (errorCount: number): string => `
  <role>
    You analyze failed test errors from one execution and group them by likely shared root cause.
  </role>

  <goal>
    Review ${errorCount} execution-local failures from a single analysis category.
    Use the semantic descriptions as the primary signal and use the algorithmic clusters only as hints.
  </goal>

  <instructions>
    <rule>Every resultErrorId must appear exactly once.</rule>
    <rule>Singleton groups are allowed when no reliable match exists.</rule>
    <rule>Prefer semantic grouping over textual similarity when descriptions point to the same root cause.</rule>
    <rule>groupDescription must be one concise sentence.</rule>
    <rule>confidence must be a number from 0 to 1.</rule>
    <rule>suggestedIssueQuery should be a short 2-4 word issue search query when possible.</rule>
  </instructions>

  <output>
    Return strict JSON with this shape:
    {
      "groups": [
        {
          "resultErrorIds": ["id1", "id2"],
          "groupDescription": "Shared root cause summary.",
          "confidence": 0.84,
          "suggestedIssueQuery": "auth token"
        }
      ]
    }
  </output>
`;