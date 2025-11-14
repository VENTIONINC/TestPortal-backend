export const getLegacyTestAnalysisPrompt = (
  resultsCount: number,
  essentialData: string,
): string => {
  const prompt = `Analyze ${resultsCount} Playwright test results. Return exactly ${resultsCount} analysis objects.

    Categories for FAILED tests only:
    - bug: App defects, logic errors, assertion failures
    - infra: Environment, network, deployment, MFA/auth issues  
    - performance: Timeouts, slow responses, resource constraints
    - script: Test automation issues, selector problems
    - other: Everything else

    Guidelines:
    - Timeouts: performance (slow app) or infra (network)
    - Auth/MFA errors: infra or script
    - Assertion failures: bug
    - Selector not found: script
    - Network errors: infra

    Return JSON only:
    {"results":[{"id":"unique_id","workerIndex":0,"status":"passed|failed","category":"bug|infra|performance|script|other","confidence":0.0-1.0,"conclusion":"Brief explanation for categorization"}]}

    Requirements:
    - Use provided id, workerIndex, status
    - Category only for failed tests
    - Confidence 0.0-1.0
    - Conclusion: 2-3 sentences max explaining why this category was chosen (only for failed tests)
    - Exactly ${resultsCount} results

    Data:
    ${JSON.stringify(essentialData, null, 2)}`;

  return prompt;
};
