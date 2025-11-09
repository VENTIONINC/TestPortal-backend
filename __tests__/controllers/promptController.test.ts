import { Request, Response } from "express";
import { PromptController } from "@/controllers/promptController";
import { PromptParameterService } from "@/services/promptParameterService";

// Mock the service
jest.mock("@/services/promptParameterService");
const mockPromptParameterService = PromptParameterService as jest.Mocked<typeof PromptParameterService>;

describe("PromptController", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    
    mockReq = {};
    mockRes = {
      json: mockJson,
      status: mockStatus,
    };

    jest.clearAllMocks();
  });

  describe("listPrompts", () => {
    it("should return all prompts successfully", async () => {
      const mockPrompts = [
        {
          name: "developer-code-assistant",
          title: "Developer Code Analysis Assistant",
          description: "Analyzes source code issues",
          category: "development",
          parameters: {},
          generator: jest.fn()
        }
      ];

      mockPromptParameterService.getAllPrompts.mockReturnValue(mockPrompts);

      await PromptController.listPrompts(mockReq as Request, mockRes as Response);

      expect(mockPromptParameterService.getAllPrompts).toHaveBeenCalledTimes(1);
      expect(mockJson).toHaveBeenCalledWith({ prompts: mockPrompts });
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      mockPromptParameterService.getAllPrompts.mockImplementation(() => {
        throw new Error("Service error");
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await PromptController.listPrompts(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: "Internal server error" });
      expect(consoleSpy).toHaveBeenCalledWith("Error listing prompts:", expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe("getPrompt", () => {
    it("should return a specific prompt successfully", async () => {
      const mockPrompt = {
        title: "Developer Code Analysis Assistant",
        description: "Analyzes source code issues",
        category: "development",
        parameters: {
          result_id: {
            type: "string",
            required: false,
            description: "ID of the test result",
            example: "12345"
          }
        },
        generator: jest.fn()
      };

      mockReq.params = { name: "developer-code-assistant" };
      mockPromptParameterService.getPrompt.mockReturnValue(mockPrompt);

      await PromptController.getPrompt(mockReq as Request, mockRes as Response);

      expect(mockPromptParameterService.getPrompt).toHaveBeenCalledWith("developer-code-assistant");
      expect(mockJson).toHaveBeenCalledWith({
        name: "developer-code-assistant",
        ...mockPrompt
      });
    });

    it("should return 400 when name is missing", async () => {
      mockReq.params = {};

      await PromptController.getPrompt(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: "Prompt name is required" });
      expect(mockPromptParameterService.getPrompt).not.toHaveBeenCalled();
    });

    it("should return 404 when prompt not found", async () => {
      mockReq.params = { name: "nonexistent-prompt" };
      mockPromptParameterService.getPrompt.mockReturnValue(null);

      await PromptController.getPrompt(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: "Prompt not found" });
    });

    it("should handle errors gracefully", async () => {
      mockReq.params = { name: "developer-code-assistant" };
      mockPromptParameterService.getPrompt.mockImplementation(() => {
        throw new Error("Service error");
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await PromptController.getPrompt(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: "Internal server error" });

      consoleSpy.mockRestore();
    });
  });

  describe("generatePrompt", () => {
    it("should generate prompt successfully with parameters", async () => {
      const mockPromptResult = {
        messages: [
          {
            role: "assistant" as const,
            content: {
              type: "text" as const,
              text: "# Developer Code Analysis Assistant\n\nYou are a specialized AI assistant..."
            }
          }
        ]
      };

      const inputParams = {
        result_id: "12345",
        error_id: "67890",
        context_scope: "full context"
      };

      mockReq.params = { name: "developer-code-assistant" };
      mockReq.body = inputParams;
      mockPromptParameterService.generatePrompt.mockReturnValue(mockPromptResult);

      await PromptController.generatePrompt(mockReq as Request, mockRes as Response);

      expect(mockPromptParameterService.generatePrompt).toHaveBeenCalledWith(
        "developer-code-assistant", 
        inputParams
      );
      expect(mockJson).toHaveBeenCalledWith({
        name: "developer-code-assistant",
        parameters: inputParams,
        generated_prompt: mockPromptResult.messages[0]?.content.text
      });
    });

    it("should generate prompt with empty body", async () => {
      const mockPromptResult = {
        messages: [
          {
            role: "assistant" as const,
            content: {
              type: "text" as const,
              text: "Generated prompt text"
            }
          }
        ]
      };

      mockReq.params = { name: "developer-code-assistant" };
      mockReq.body = undefined;
      mockPromptParameterService.generatePrompt.mockReturnValue(mockPromptResult);

      await PromptController.generatePrompt(mockReq as Request, mockRes as Response);

      expect(mockPromptParameterService.generatePrompt).toHaveBeenCalledWith(
        "developer-code-assistant", 
        {}
      );
      expect(mockJson).toHaveBeenCalledWith({
        name: "developer-code-assistant",
        parameters: {},
        generated_prompt: "Generated prompt text"
      });
    });

    it("should return 400 when name is missing", async () => {
      mockReq.params = {};
      mockReq.body = {};

      await PromptController.generatePrompt(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: "Prompt name is required" });
      expect(mockPromptParameterService.generatePrompt).not.toHaveBeenCalled();
    });

    it("should return 404 when prompt not found", async () => {
      mockReq.params = { name: "nonexistent-prompt" };
      mockReq.body = {};
      mockPromptParameterService.generatePrompt.mockReturnValue(null);

      await PromptController.generatePrompt(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: "Prompt not found" });
    });

    it("should handle undefined message content gracefully", async () => {
      const mockPromptResult = {
        messages: [
          {
            role: "assistant" as const,
            content: {
              type: "text" as const,
              text: undefined as unknown as string
            }
          }
        ]
      };

      mockReq.params = { name: "developer-code-assistant" };
      mockReq.body = {};
      mockPromptParameterService.generatePrompt.mockReturnValue(mockPromptResult);

      await PromptController.generatePrompt(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        name: "developer-code-assistant",
        parameters: {},
        generated_prompt: undefined
      });
    });

    it("should handle errors gracefully", async () => {
      mockReq.params = { name: "developer-code-assistant" };
      mockReq.body = {};
      mockPromptParameterService.generatePrompt.mockImplementation(() => {
        throw new Error("Service error");
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await PromptController.generatePrompt(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: "Internal server error" });

      consoleSpy.mockRestore();
    });
  });
});