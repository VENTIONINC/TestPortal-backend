import { Request, Response, NextFunction } from "express";
import { validateApiKey } from "@/lib/mcp-token";
import { userService } from "@/services/userService";

export interface ApiKeyAuthenticatedRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  };
  apiKeyUsed?: boolean;
}

export const apiKeyMiddleware = async (
  req: ApiKeyAuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: "Authorization header is required",
      });
      return;
    }

    let apiKey: string;

    if (authHeader.startsWith("api_")) {
      apiKey = authHeader;
    } else {
      const parts = authHeader.split(" ");
      if (parts.length !== 2) {
        res.status(401).json({
          error:
            "Invalid authorization header format. Use 'api_...' or 'ApiKey api_...'",
        });
        return;
      }

      const scheme = parts[0];
      if (!scheme || scheme !== "ApiKey") {
        res.status(401).json({
          error: "Invalid authorization scheme. Use 'ApiKey'",
        });
        return;
      }

      apiKey = parts[1] ?? "";
    }

    if (!apiKey) {
      res.status(401).json({
        error: "API key is required",
      });
      return;
    }

    const apiSecret = process.env.API_SECRET;
    if (!apiSecret) {
      res.status(500).json({
        error: "API authentication is not properly configured",
      });
      return;
    }

    const validationResult = validateApiKey(apiKey, apiSecret);
    if (!validationResult) {
      res.status(401).json({
        error: "Invalid or expired API key",
      });
      return;
    }
    const user = await userService.getUserById(validationResult.userId);

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    req.apiKeyUsed = true;

    next();
  } catch (error) {
    const err = error as Error;
    res.status(401).json({
      error: `API key authentication failed: ${err.message}`,
    });
  }
};
