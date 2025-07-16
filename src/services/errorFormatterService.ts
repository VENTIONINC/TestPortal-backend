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

export const errorFormatterService = {
  async formatErrorMessage(input: ErrorFormatterInput): Promise<string> {
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
      });

      const formattedMessage = response.choices[0]?.message?.content ?? input.description;

      logger.info("Successfully formatted error message");
      return formattedMessage;
    } catch (error) {
      logger.error("Error formatting message:", error);
      throw new Error("Failed to format error message");
    }
  },
};
