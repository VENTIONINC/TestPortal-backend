// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { authProviderService } from "@/services/authProviderService";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  userService,
  type CreateUserParams,
  type UpdateUserParams,
  type UpdateUserIntegrationsParams,
  type LoginParams,
} from "@/services/userService";
import type { PrismaUser } from "@/types";

const createSafeUserResponse = (user: PrismaUser) => {
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
};

const getAuthenticatedUserId = (
  req: AuthenticatedRequest,
  res: Response,
): string | null => {
  if (!req.user) {
    res.status(401).json({
      error: "User is not authenticated",
    });
    return null;
  }

  return req.user.id;
};

export const userController = {
  getAuthConfig: async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(authProviderService.getConfig());
  },

  getUserById: async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = getAuthenticatedUserId(req, res);
      if (!userId) return;

      const user = await userService.getUserById(userId);
      const safeUser = createSafeUserResponse(user);
      res.status(200).json(safeUser);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },

  signup: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body) {
        res.status(400).json({
          error: "User data is required",
        });
        return;
      }

      const userParams: CreateUserParams = req.body;

      const user = await userService.signup(userParams);
      const safeUser = createSafeUserResponse(user);
      res.status(201).json(safeUser);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: err.message,
      });
    }
  },

  updateUser: async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = getAuthenticatedUserId(req, res);
      if (!userId) return;

      if (!req.body || Object.keys(req.body).length === 0) {
        res.status(400).json({
          error: "Update data is required",
        });
        return;
      }

      const updateData: UpdateUserParams = req.body;

      const updatedUser = await userService.updateUser(userId, updateData);
      const safeUser = createSafeUserResponse(updatedUser);
      res.status(200).json(safeUser);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to update user. ${err.message}`,
      });
    }
  },

  login: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body) {
        res.status(400).json({
          error: "Login data is required",
        });
        return;
      }

      const loginParams: LoginParams = req.body;
      const authResponse = await authProviderService.login(loginParams);

      res.status(200).json(authResponse);
    } catch (error) {
      const err = error as Error;
      res.status(401).json({
        error: err.message,
      });
    }
  },

  refreshToken: async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: "Refresh token is required",
        });
        return;
      }

      const authResponse = await userService.refreshTokens(refreshToken);

      res.status(200).json(authResponse);
    } catch (error) {
      const err = error as Error;
      res.status(401).json({
        error: err.message,
      });
    }
  },

  generateMcpToken: async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = getAuthenticatedUserId(req, res);
      if (!userId) return;

      const mcpToken = await userService.generateMcpToken(userId);

      res.status(200).json({
        mcpToken,
        message: "MCP token generated successfully",
      });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: err.message,
      });
    }
  },

  revokeMcpToken: async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = getAuthenticatedUserId(req, res);
      if (!userId) return;

      await userService.revokeMcpToken(userId);

      res.status(200).json({
        message: "MCP token revoked successfully",
      });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: err.message,
      });
    }
  },

  authSignup: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body) {
        res.status(400).json({
          error: "User data is required",
        });
        return;
      }

      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({
          error: "Name, email, and password are required",
        });
        return;
      }

      const result = await authProviderService.signup({ name, email, password });
      const safeUser = createSafeUserResponse(result.user);

      res.status(201).json({
        user: safeUser,
        ...(result.message ? { message: result.message } : {}),
      });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: err.message,
      });
    }
  },

  authLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body) {
        res.status(400).json({
          error: "Login data is required",
        });
        return;
      }

      const { email, password, newPassword } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: "Email and password are required",
        });
        return;
      }

      const authResponse = await authProviderService.login({
        email,
        password,
        ...(newPassword ? { newPassword } : {}),
      });

      res.status(200).json(authResponse);
    } catch (error) {
      const err = error as Error;
      res.status(401).json({
        error: err.message,
      });
    }
  },

  authLogout: async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await authProviderService.logout();
      res.status(200).json({
        message: result,
      });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: err.message,
      });
    }
  },

  cognitoSignup: async (req: Request, res: Response): Promise<void> => {
    await userController.authSignup(req, res);
  },

  cognitoLogin: async (req: Request, res: Response): Promise<void> => {
    await userController.authLogin(req, res);
  },

  cognitoSignOut: async (req: Request, res: Response): Promise<void> => {
    await userController.authLogout(req, res);
  },

  updateUserIntegrations: async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = getAuthenticatedUserId(req, res);
      if (!userId) return;

      const integrationsData: UpdateUserIntegrationsParams = req.body;

      if (!integrationsData || Object.keys(integrationsData).length === 0) {
        res.status(400).json({
          error: "Integration data is required",
        });
        return;
      }

      const updatedUser = await userService.updateUserIntegrations(
        userId,
        integrationsData,
      );
      const safeUser = createSafeUserResponse(updatedUser);
      res.status(200).json(safeUser);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to update user integrations. ${err.message}`,
      });
    }
  },
};
