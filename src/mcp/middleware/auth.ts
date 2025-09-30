import { Request, Response, NextFunction } from "express";
import { validateMcpToken } from "@/lib/mcp-token";

// Extended request interface with mcpUserId
export interface RequestWithMcpUser extends Request {
  mcpUserId?: string;
}

// MCP token validation middleware
export const authenticateMcpToken = (
  req: RequestWithMcpUser,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message:
          "Missing or invalid authorization header. Expected 'Authorization: Bearer <token>'",
      },
      id: null,
    });
    return;
  }

  const token = authHeader.substring(7);
  const mcpSecret = process.env.MCP_SECRET;

  if (!mcpSecret) {
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32003,
        message: "Server configuration error: MCP_SECRET not configured",
      },
      id: null,
    });
    return;
  }

  const validation = validateMcpToken(token, mcpSecret);

  if (!validation) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32002,
        message: "Invalid or expired MCP token",
      },
      id: null,
    });
    return;
  }

  // Add userId to request for potential use in tools
  req.mcpUserId = validation.userId;
  next();
};
