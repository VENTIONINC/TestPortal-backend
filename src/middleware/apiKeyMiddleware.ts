import { Request, Response, NextFunction } from "express";
import { uploadApiKeyService } from "@/services/uploadApiKeyService";

export interface ApiKeyAuthenticatedRequest extends Request {
  apiKey?: {
    projectId: string;
    ownerId: string;
    keyId: string;
  };
}

export const apiKeyMiddleware = async (
  req: ApiKeyAuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      res.status(401).json({
        error: "Missing X-API-Key header",
      });
      return;
    }

    const validatedKey = await uploadApiKeyService.validateApiKey(apiKey);

    req.apiKey = validatedKey;

    next();
  } catch (error) {
    const err = error as Error;
    res.status(401).json({
      error: err.message || "Invalid API key",
    });
  }
};
