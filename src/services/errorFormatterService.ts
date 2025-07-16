import OpenAI from "openai";
import getLogger from "@/lib/logger";
import { getErrorFormatterPrompt } from "@/prompts/error-formatter";

const client = new OpenAI();
const logger = getLogger("error-formatter");

export interface ErrorFormatterInput {
  name: string;
  description: string;
  category: string;
}

export interface ErrorFormatterOutput {
  name: string;
  description: string;
}

export const errorFormatterService = {
  async formatErrorMessage(input: ErrorFormatterInput): Promise<ErrorFormatterOutput> {
    try {
      logger.info("Formatting error message with OpenAI");

      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: getErrorFormatterPrompt(),
          },
          {
            role: "user",
            content: `Name: ${input.name}
Description: ${input.description}
Category: ${input.category}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "error_formatter_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Formatted error name that is clear and descriptive"
                },
                description: {
                  type: "string", 
                  description: "Formatted error description that is clear and actionable"
                }
              },
              required: ["name", "description"],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response content from OpenAI");
      }

      const formattedOutput: ErrorFormatterOutput = JSON.parse(content);
      
      logger.info("Successfully formatted error message");
      return formattedOutput;
    } catch (error) {
      logger.error("Error formatting message:", error);
      throw new Error("Failed to format error message");
    }
  },
};
