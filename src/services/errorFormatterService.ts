import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import getLogger from "@/lib/logger";
import { getErrorFormatterPrompt } from "@/prompts/error-formatter/v1.0.0";
import {
  errorFormatterSchema,
  type ErrorFormatterInput,
  type ErrorFormatterOutput,
} from "@/schemas/errorFormatterSchemas";

const logger = getLogger("error-formatter");

export const errorFormatterService = {
  async formatErrorMessage(
    input: ErrorFormatterInput,
  ): Promise<ErrorFormatterOutput> {
    try {
      logger.info("Formatting error message with LangChain");

      const model = new ChatOpenAI({
        model: "gpt-4.1-mini",
        temperature: 0.7,
        maxTokens: 500,
        maxRetries: 2,
      });

      const structuredModel = model.withStructuredOutput<
        z.infer<typeof errorFormatterSchema>
      >(errorFormatterSchema, {
        name: "error_formatter_response",
      });

      const userContent = `Name: ${input.name}
Description: ${input.description}
Category: ${input.category}`;

      const result = await structuredModel.invoke([
        { role: "system", content: getErrorFormatterPrompt() },
        { role: "user", content: userContent },
      ]);

      logger.info("Successfully formatted error message");
      return result;
    } catch (error) {
      logger.error("Error formatting message:", error);
      throw new Error("Failed to format error message");
    }
  },
};
