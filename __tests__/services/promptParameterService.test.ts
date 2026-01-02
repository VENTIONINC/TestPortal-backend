import { PromptParameterService } from "@/services/promptParameterService";
import { developerCodeAssistantPrompt } from "@/mcp/prompts/developer-code-assistant/v1.0.0";
import { testPortalAssistantPrompt } from "@/mcp/prompts/test-portal-assistant/v1.0.0";
import { issueAnalysisAssistantPrompt } from "@/mcp/prompts/issue-analysis-assistant/v1.0.0";
import { environmentPerformanceAssistantPrompt } from "@/mcp/prompts/environment-performance-assistant/v1.0.0";
import { softwareDocumentationAssistantPrompt } from "@/mcp/prompts/documentation-architect/v1.0.0";

// Mock the prompt functions
jest.mock("@/mcp/prompts/developer-code-assistant/v1.0.0");
jest.mock("@/mcp/prompts/test-portal-assistant/v1.0.0");
jest.mock("@/mcp/prompts/issue-analysis-assistant/v1.0.0");
jest.mock("@/mcp/prompts/environment-performance-assistant/v1.0.0");
jest.mock("@/mcp/prompts/documentation-architect/v1.0.0");

const mockDeveloperCodeAssistantPrompt = developerCodeAssistantPrompt as jest.MockedFunction<typeof developerCodeAssistantPrompt>;
const mockTestPortalAssistantPrompt = testPortalAssistantPrompt as jest.MockedFunction<typeof testPortalAssistantPrompt>;
const mockIssueAnalysisAssistantPrompt = issueAnalysisAssistantPrompt as jest.MockedFunction<typeof issueAnalysisAssistantPrompt>;
const mockEnvironmentPerformanceAssistantPrompt = environmentPerformanceAssistantPrompt as jest.MockedFunction<typeof environmentPerformanceAssistantPrompt>;
const mockSoftwareDocumentationAssistantPrompt = softwareDocumentationAssistantPrompt as jest.MockedFunction<typeof softwareDocumentationAssistantPrompt>;

describe("PromptParameterService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllPrompts", () => {
    it("should return all available prompts", () => {
      const prompts = PromptParameterService.getAllPrompts();

      expect(prompts).toHaveLength(5);

      const promptNames = prompts.map(p => p.name);
      expect(promptNames).toContain("developer-code-assistant");
      expect(promptNames).toContain("test-portal-assistant");
      expect(promptNames).toContain("issue-analysis-assistant");
      expect(promptNames).toContain("environment-performance-assistant");
      expect(promptNames).toContain("software-documentation-assistant");

      // Check developer code assistant
      const devAssistant = prompts.find(p => p.name === "developer-code-assistant");
      expect(devAssistant).toBeDefined();
      expect(devAssistant?.category).toBe("development");
      expect(devAssistant?.parameters).toHaveProperty("result_id");

      // Check test portal assistant
      const testPortal = prompts.find(p => p.name === "test-portal-assistant");
      expect(testPortal).toBeDefined();
      expect(testPortal?.category).toBe("reporting");
      expect(testPortal?.parameters).toHaveProperty("time_period");

      // Check issue analysis assistant
      const issueAnalysis = prompts.find(p => p.name === "issue-analysis-assistant");
      expect(issueAnalysis).toBeDefined();
      expect(issueAnalysis?.category).toBe("analysis");
      expect(issueAnalysis?.parameters).toHaveProperty("analysis_scope");

      // Check environment performance assistant
      const envPerf = prompts.find(p => p.name === "environment-performance-assistant");
      expect(envPerf).toBeDefined();
      expect(envPerf?.category).toBe("performance");
      expect(envPerf?.parameters).toHaveProperty("environment_scope");

      // Check software documentation assistant
      const documentation = prompts.find(p => p.name === "software-documentation-assistant");
      expect(documentation).toBeDefined();
      expect(documentation?.category).toBe("documentation");
      expect(documentation?.parameters).toHaveProperty("file_paths");
    });
  });

  describe("getPrompt", () => {
    it("should return a specific prompt when it exists", () => {
      const prompt = PromptParameterService.getPrompt("developer-code-assistant");

      expect(prompt).not.toBeNull();
      expect(prompt?.title).toBe("Developer Code Analysis Assistant");
      expect(prompt?.category).toBe("development");
      expect(prompt?.parameters).toHaveProperty("result_id");
      expect(prompt?.parameters).toHaveProperty("error_id");
      expect(prompt?.parameters).toHaveProperty("context_scope");
    });

    it("should return null for non-existent prompt", () => {
      const prompt = PromptParameterService.getPrompt("nonexistent-prompt");

      expect(prompt).toBeNull();
    });

    it("should return null for empty string", () => {
      const prompt = PromptParameterService.getPrompt("");

      expect(prompt).toBeNull();
    });
  });

  describe("generatePrompt", () => {
    it("should generate prompt with provided parameters", () => {
      const mockResult = {
        messages: [
          {
            role: "assistant" as const,
            content: {
              type: "text" as const,
              text: "Generated prompt with result_id: 12345"
            }
          }
        ]
      };

      mockDeveloperCodeAssistantPrompt.mockReturnValue(mockResult);

      const params = {
        result_id: "12345",
        error_id: "67890",
        context_scope: "full context"
      };

      const result = PromptParameterService.generatePrompt("developer-code-assistant", params);

      expect(mockDeveloperCodeAssistantPrompt).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResult);
    });

    it("should generate prompt with empty parameters", () => {
      const mockResult = {
        messages: [
          {
            role: "assistant" as const,
            content: {
              type: "text" as const,
              text: "Generated prompt with default parameters"
            }
          }
        ]
      };

      mockDeveloperCodeAssistantPrompt.mockReturnValue(mockResult);

      const result = PromptParameterService.generatePrompt("developer-code-assistant", {});

      expect(mockDeveloperCodeAssistantPrompt).toHaveBeenCalledWith({});
      expect(result).toEqual(mockResult);
    });

    it("should return null for non-existent prompt", () => {
      const result = PromptParameterService.generatePrompt("nonexistent-prompt", {});

      expect(result).toBeNull();
      expect(mockDeveloperCodeAssistantPrompt).not.toHaveBeenCalled();
    });

    it("should handle parameters with different types", () => {
      const mockResult = {
        messages: [
          {
            role: "assistant" as const,
            content: {
              type: "text" as const,
              text: "Generated prompt"
            }
          }
        ]
      };

      mockDeveloperCodeAssistantPrompt.mockReturnValue(mockResult);

      const params = {
        result_id: "test-123",
        error_id: null,
        context_scope: undefined,
        extra_param: "should be ignored"
      };

      const result = PromptParameterService.generatePrompt("developer-code-assistant", params);

      expect(mockDeveloperCodeAssistantPrompt).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResult);
    });

    it("should generate test portal assistant prompt", () => {
      const mockResult = {
        messages: [
          {
            role: "assistant" as const,
            content: {
              type: "text" as const,
              text: "Test portal assistant prompt"
            }
          }
        ]
      };

      mockTestPortalAssistantPrompt.mockReturnValue(mockResult);

      const params = {
        time_period: "yesterday",
        report_type: "detailed",
        project_system: "linear"
      };

      const result = PromptParameterService.generatePrompt("test-portal-assistant", params);

      expect(mockTestPortalAssistantPrompt).toHaveBeenCalledWith({
        time_period: "yesterday",
        report_type: "detailed",
        project_system: "linear"
      });
      expect(result).toEqual(mockResult);
    });

    it("should generate issue analysis assistant prompt", () => {
      const mockResult = {
        messages: [
          {
            role: "assistant" as const,
            content: {
              type: "text" as const,
              text: "Issue analysis assistant prompt"
            }
          }
        ]
      };

      mockIssueAnalysisAssistantPrompt.mockReturnValue(mockResult);

      const params = {
        analysis_scope: "production environment",
        error_context: "timeout_error",
        target_system: "github"
      };

      const result = PromptParameterService.generatePrompt("issue-analysis-assistant", params);

      expect(mockIssueAnalysisAssistantPrompt).toHaveBeenCalledWith({
        analysis_scope: "production environment",
        error_context: "timeout_error",
        target_system: "github"
      });
      expect(result).toEqual(mockResult);
    });

    it("should generate environment performance assistant prompt", () => {
      const mockResult = {
        messages: [
          {
            role: "assistant" as const,
            content: {
              type: "text" as const,
              text: "Environment performance assistant prompt"
            }
          }
        ]
      };

      mockEnvironmentPerformanceAssistantPrompt.mockReturnValue(mockResult);

      const params = {
        environment_scope: "staging",
        performance_metric: "success_rate",
        time_range: "last_month"
      };

      const result = PromptParameterService.generatePrompt("environment-performance-assistant", params);

      expect(mockEnvironmentPerformanceAssistantPrompt).toHaveBeenCalledWith({
        environment_scope: "staging",
        performance_metric: "success_rate",
        time_range: "last_month"
      });
      expect(result).toEqual(mockResult);
    });

    it("should use default values for missing required parameters", () => {
      const mockResult = {
        messages: [
          {
            role: "assistant" as const,
            content: {
              type: "text" as const,
              text: "Test portal with defaults"
            }
          }
        ]
      };

      mockTestPortalAssistantPrompt.mockReturnValue(mockResult);

      const result = PromptParameterService.generatePrompt("test-portal-assistant", {});

      expect(mockTestPortalAssistantPrompt).toHaveBeenCalledWith({
        time_period: "today",
        report_type: "summary",
        project_system: "jira"
      });
      expect(result).toEqual(mockResult);
    });

    it("should generate software documentation assistant prompt", () => {
      const mockResult = {
        messages: [
          {
            role: "assistant" as const,
            content: {
              type: "text" as const,
              text: "Software documentation assistant prompt"
            }
          }
        ]
      };

      mockSoftwareDocumentationAssistantPrompt.mockReturnValue(mockResult);

      const params = {
        file_paths: "src/controllers/userController.ts",
        documentation_type: "API Reference",
        target_audience: "Internal Team",
        scope: "authentication module",
        publish: "false"
      };

      const result = PromptParameterService.generatePrompt("software-documentation-assistant", params);

      expect(mockSoftwareDocumentationAssistantPrompt).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResult);
    });
  });
});