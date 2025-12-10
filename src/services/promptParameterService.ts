/**
 * Simple service for managing prompt parameters and generation
 */

import type { GetPromptResult } from "@modelcontextprotocol/sdk/types";
import { developerCodeAssistantPrompt } from "@/mcp/prompts/developer-code-assistant";
import { testPortalAssistantPrompt } from "@/mcp/prompts/test-portal-assistant";
import { issueAnalysisAssistantPrompt } from "@/mcp/prompts/issue-analysis-assistant";
import { environmentPerformanceAssistantPrompt } from "@/mcp/prompts/environment-performance-assistant";
import { softwareDocumentationAssistantPrompt } from "@/mcp/prompts/documentation-architect";

interface PromptConfig {
  title: string;
  description: string;
  category: string;
  parameters: Record<string, {
    type: string;
    required: boolean;
    description: string;
    example?: string;
  }>;
  generator: (params: Record<string, unknown>) => GetPromptResult;
}

const PROMPTS: Record<string, PromptConfig> = {
  'developer-code-assistant': {
    title: 'Developer Code Analysis Assistant',
    description: 'Analyzes source code issues identified through test failures and provides specific fix recommendations',
    category: 'development',
    parameters: {
      result_id: {
        type: 'string',
        required: false,
        description: 'ID of the test result to analyze for code issues',
        example: '12345'
      },
      error_id: {
        type: 'string',
        required: false,
        description: 'ID of the specific result error to analyze',
        example: '67890'
      },
      context_scope: {
        type: 'string',
        required: false,
        description: 'Scope of code analysis (function, class, module, full context)',
        example: 'full context'
      }
    },
    generator: developerCodeAssistantPrompt
  },

  'test-portal-assistant': {
    title: 'Test Portal Report Generator',
    description: 'Generates comprehensive test summary reports from test portal data',
    category: 'reporting',
    parameters: {
      time_period: {
        type: 'string',
        required: true,
        description: 'Time period for test results analysis',
        example: 'today'
      },
      report_type: {
        type: 'string',
        required: false,
        description: 'Type of report to generate',
        example: 'summary'
      },
      project_system: {
        type: 'string',
        required: true,
        description: 'Target project management system for task creation',
        example: 'jira'
      }
    },
    generator: (params: Record<string, unknown>) => testPortalAssistantPrompt({
      time_period: params.time_period as string || 'today',
      report_type: params.report_type as string || 'summary',
      project_system: params.project_system as string || 'jira'
    })
  },

  'issue-analysis-assistant': {
    title: 'Issue Analysis & Root Cause Assistant',
    description: 'Analyzes error patterns, manages assumptions, and provides root cause analysis for test failures',
    category: 'analysis',
    parameters: {
      analysis_scope: {
        type: 'string',
        required: true,
        description: 'Scope of analysis (recent executions, specific environment, error type, etc.)',
        example: 'recent executions'
      },
      error_context: {
        type: 'string',
        required: false,
        description: 'Specific error context or error ID to analyze',
        example: '67890'
      },
      target_system: {
        type: 'string',
        required: false,
        description: 'Target project management system for issue creation',
        example: 'jira'
      }
    },
    generator: (params: Record<string, unknown>) => issueAnalysisAssistantPrompt({
      analysis_scope: params.analysis_scope as string || 'recent executions',
      error_context: params.error_context as string,
      target_system: params.target_system as string
    })
  },

  'environment-performance-assistant': {
    title: 'Environment & Performance Analysis Assistant',
    description: 'Analyzes test environment stability, performance metrics, and infrastructure health',
    category: 'performance',
    parameters: {
      environment_scope: {
        type: 'string',
        required: true,
        description: 'Environment scope for analysis (specific environment name, all, production, etc.)',
        example: 'all environments'
      },
      performance_metric: {
        type: 'string',
        required: false,
        description: 'Specific performance metric to analyze (execution_time, success_rate, resource_usage, etc.)',
        example: 'execution_time'
      },
      time_range: {
        type: 'string',
        required: false,
        description: 'Time range for analysis (last_24h, last_week, last_month, etc.)',
        example: 'last_week'
      }
    },
    generator: (params: Record<string, unknown>) => environmentPerformanceAssistantPrompt({
      environment_scope: params.environment_scope as string || 'all environments',
      performance_metric: params.performance_metric as string,
      time_range: params.time_range as string
    })
  },

  'software-documentation-assistant': {
    title: 'Software Documentation Architect',
    description: 'Generates high-quality technical documentation by analyzing source code. Creates API references, Getting Started guides, and architecture docs',
    category: 'documentation',
    parameters: {
      file_paths: {
        type: 'string',
        required: false,
        description: 'Comma-separated file paths to document',
        example: 'src/controllers/userController.ts,src/services/userService.ts'
      },
      documentation_type: {
        type: 'string',
        required: false,
        description: 'Type of documentation to generate (Getting Started, API Reference, Architecture, README, Integration Guide)',
        example: 'API Reference'
      },
      target_audience: {
        type: 'string',
        required: false,
        description: 'Target readers (Internal Team, Public API Consumers, Junior Developers, DevOps Engineers)',
        example: 'Internal Team'
      },
      scope: {
        type: 'string',
        required: false,
        description: 'Documentation scope (entire project, authentication module, database layer, specific feature)',
        example: 'authentication module'
      },
      publish: {
        type: 'string',
        required: false,
        description: 'Whether to publish documentation to available MCP storage (true/yes/false/no)',
        example: 'false'
      }
    },
    generator: (params: Record<string, unknown>) => softwareDocumentationAssistantPrompt({
      file_paths: params.file_paths as string,
      documentation_type: params.documentation_type as string,
      target_audience: params.target_audience as string,
      scope: params.scope as string,
      publish: params.publish as string
    })
  }
};

export class PromptParameterService {
  static getPrompt(name: string): PromptConfig | null {
    return PROMPTS[name] ?? null;
  }

  static getAllPrompts() {
    return Object.entries(PROMPTS).map(([name, config]) => ({
      name,
      ...config
    }));
  }

  static generatePrompt(name: string, params: Record<string, unknown>): GetPromptResult | null {
    const prompt = this.getPrompt(name);
    if (!prompt) return null;

    return prompt.generator(params);
  }
}