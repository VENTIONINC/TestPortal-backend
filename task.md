# Task: Add MCP Prompts to Test Portal Server

## Objective

Add pre-configured prompts to the test portal MCP server to provide ready-to-use analytical workflows that combine multiple tools intelligently.

## Implementation Requirements

### 1. Add Prompts Configuration

Create a prompts configuration in the MCP server that includes the following prompts:

### 2. Prompt Definitions

#### **Health Check Prompt**

```json
{
  "name": "test_portal_health_check",
  "description": "Check test portal server status and current time",
  "arguments": [],
  "tools": ["test-portal:check-status", "test-portal:current-time"]
}
```

#### **Issue Analysis Prompt**

```json
{
  "name": "analyze_recent_issues",
  "description": "Analyze recent issues by category with pagination support",
  "arguments": [
    {
      "name": "category",
      "description": "Issue category (Bug, Script, Infra, Performance)",
      "required": false,
      "type": "string"
    },
    {
      "name": "days",
      "description": "Number of days to look back",
      "required": false,
      "type": "number"
    }
  ],
  "tools": ["test-portal:get-issues", "test-portal:get-issue-by-id"]
}
```

#### **Test Results Investigation Prompt**

```json
{
  "name": "investigate_test_failures",
  "description": "Deep dive into failed test results with statistical analysis",
  "arguments": [
    {
      "name": "environment",
      "description": "Test environment to analyze",
      "required": false,
      "type": "string"
    },
    {
      "name": "spec_file",
      "description": "Specific test file to analyze",
      "required": false,
      "type": "string"
    },
    {
      "name": "date_range",
      "description": "Date range for analysis (e.g., 'last 7 days')",
      "required": false,
      "type": "string"
    }
  ],
  "tools": [
    "test-portal:get-results",
    "test-portal:get-result-by-id",
    "test-portal:get-results-stats",
    "test-portal:get-result-error-by-id"
  ]
}
```

#### **Automated Error Review Prompt**

```json
{
  "name": "automated_error_review",
  "description": "Run automated review on test errors and create assumptions",
  "arguments": [
    {
      "name": "error_ids",
      "description": "Array of error IDs to review",
      "required": true,
      "type": "array"
    }
  ],
  "tools": [
    "test-portal:review-result-error",
    "test-portal:bulk-review-result-errors",
    "test-portal:create-assumption",
    "test-portal:get-assumption-by-id"
  ]
}
```

#### **Issue-Error Linking Prompt**

```json
{
  "name": "link_issues_to_errors",
  "description": "Create connections between issues and test errors with assumptions",
  "arguments": [
    {
      "name": "issue_id",
      "description": "Issue ID to link",
      "required": true,
      "type": "number"
    },
    {
      "name": "error_id",
      "description": "Result error ID",
      "required": true,
      "type": "number"
    },
    {
      "name": "hypothesis",
      "description": "Assumption hypothesis text",
      "required": false,
      "type": "string"
    }
  ],
  "tools": [
    "test-portal:create-assumption",
    "test-portal:assign-issue-to-result-error",
    "test-portal:get-issue-by-id",
    "test-portal:get-result-error-by-id"
  ]
}
```

#### **Comprehensive Test Report Prompt**

```json
{
  "name": "generate_test_report",
  "description": "Generate comprehensive test analysis report with trends and insights",
  "arguments": [
    {
      "name": "date_range",
      "description": "Date range for report (array of dates or duration)",
      "required": true,
      "type": "string"
    },
    {
      "name": "include_mock",
      "description": "Include mock data for comparison",
      "required": false,
      "type": "boolean"
    }
  ],
  "tools": [
    "test-portal:get-results-stats",
    "test-portal:get-results",
    "test-portal:get-issues",
    "test-portal:get-mock-issues",
    "test-portal:current-time"
  ]
}
```

## Implementation Steps

1. **Add MCP Prompts Handler**: Implement the `prompts/list` and `prompts/get` handlers in the MCP server
2. **Define Prompt Logic**: Create the logic for each prompt that chains the appropriate tool calls
3. **Argument Validation**: Add validation for prompt arguments
4. **Error Handling**: Implement proper error handling for prompt execution
5. **Documentation**: Update MCP server documentation with prompt usage examples
6. **Testing**: Create test cases for each prompt to ensure they work correctly

## Expected Benefits

- **Simplified Usage**: Users can execute complex analytical workflows with simple prompt calls
- **Consistent Analysis**: Standardized approaches to common test analysis tasks
- **Reduced Complexity**: No need to manually chain multiple tool calls
- **Better UX**: More intuitive interface for test portal functionality
- **Reusability**: Predefined workflows that can be easily reused across different contexts

## Acceptance Criteria

- [ ] All 6 prompts are implemented and functional
- [ ] Prompts properly chain tool calls based on arguments
- [ ] Argument validation works correctly
- [ ] Error handling is robust
- [ ] Documentation includes usage examples
- [ ] Test coverage for all prompts exists
