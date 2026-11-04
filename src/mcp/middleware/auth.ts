// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, NextFunction } from "express";
import { validateMcpToken } from "@/lib/mcp-token";
import getLogger from "@/lib/logger";
import { userService } from "@/services/userService";

const logger = getLogger("mcp-auth");

// Extended request interface with mcpUserId
export interface RequestWithMcpUser extends Request {
  mcpUserId?: string;
}

export const handleMcpSessionRequest = async (
  sessionUserId: string,
  req: RequestWithMcpUser,
  res: Response,
  handleTransport: () => Promise<void>,
): Promise<void> => {
  if (!req.mcpUserId) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "MCP user is not authenticated" },
      id: null,
    });
    return;
  }

  if (req.mcpUserId !== sessionUserId) {
    res.status(403).json({
      jsonrpc: "2.0",
      error: {
        code: -32004,
        message: "MCP session belongs to a different user",
      },
      id: null,
    });
    return;
  }

  await handleTransport();
};

// MCP token validation middleware
export const authenticateMcpToken = async (
  req: RequestWithMcpUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
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

  let current = false;
  if (validation) {
    try {
      current = await userService.validateMcpCredential(validation.userId, token);
    } catch {
      logger.error("MCP credential lookup failed for user", validation.userId);
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
      return;
    }
  }

  if (!validation || !current) {
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
