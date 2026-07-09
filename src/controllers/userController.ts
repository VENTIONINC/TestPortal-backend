// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { authProviderService } from "@/services/authProviderService";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  toSafeUser,
  userService,
  type CreateUserParams,
  type UpdateUserParams,
  type UpdateUserIntegrationsParams,
  type LoginParams,
  UserServiceError,
} from "@/services/userService";

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

const handleUserError = (
  res: Response,
  error: unknown,
  fallbackStatusCode: number,
  prefix?: string,
): void => {
  const err = error as Error;
  const statusCode =
    error instanceof UserServiceError ? error.statusCode : fallbackStatusCode;

  res.status(statusCode).json({
    error: prefix ? `${prefix}${err.message}` : err.message,
  });
};

const toAdminSafeUser = (user: ReturnType<typeof toSafeUser>) => {
  const { mcpToken: _, ...adminSafeUser } = user;
  return adminSafeUser;
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
      const safeUser = toSafeUser(user);
      res.status(200).json(safeUser);
    } catch (error) {
      handleUserError(res, error, 404);
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
      const safeUser = toSafeUser(user);
      res.status(201).json(safeUser);
    } catch (error) {
      handleUserError(res, error, 400);
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
      const safeUser = toSafeUser(updatedUser);
      res.status(200).json(safeUser);
    } catch (error) {
      handleUserError(res, error, 400, "Failed to update user. ");
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
      handleUserError(res, error, 401);
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
      handleUserError(res, error, 401);
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
      handleUserError(res, error, 400);
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
      handleUserError(res, error, 400);
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
      const safeUser = toSafeUser(result.user);

      res.status(201).json({
        user: safeUser,
        ...(result.message ? { message: result.message } : {}),
      });
    } catch (error) {
      handleUserError(res, error, 400);
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
      handleUserError(res, error, 401);
    }
  },

  authLogout: async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await authProviderService.logout();
      res.status(200).json({
        message: result,
      });
    } catch (error) {
      handleUserError(res, error, 400);
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
      const safeUser = toSafeUser(updatedUser);
      res.status(200).json(safeUser);
    } catch (error) {
      handleUserError(
        res,
        error,
        400,
        "Failed to update user integrations. ",
      );
    }
  },

  listUsers: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const users = await userService.listUsers();
      res.status(200).json(users.map((user) => toAdminSafeUser(toSafeUser(user))));
    } catch (error) {
      handleUserError(res, error, 400);
    }
  },

  approveUser: async (
    req: AuthenticatedRequest<{ userId: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      const user = await userService.approvePendingUser(req.params.userId);
      res.status(200).json(toAdminSafeUser(toSafeUser(user)));
    } catch (error) {
      handleUserError(res, error, 400);
    }
  },

  suspendUser: async (
    req: AuthenticatedRequest<{ userId: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      const user = await userService.suspendUser(req.params.userId);
      res.status(200).json(toAdminSafeUser(toSafeUser(user)));
    } catch (error) {
      handleUserError(res, error, 400);
    }
  },

  restoreUser: async (
    req: AuthenticatedRequest<{ userId: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      const user = await userService.restoreSuspendedUser(req.params.userId);
      res.status(200).json(toAdminSafeUser(toSafeUser(user)));
    } catch (error) {
      handleUserError(res, error, 400);
    }
  },

  changeUserRole: async (
    req: AuthenticatedRequest<{ userId: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      const { role } = req.body as { role?: "admin" | "member" };

      if (!role) {
        res.status(400).json({
          error: "Role is required",
        });
        return;
      }

      const user = await userService.changeUserRole({
        targetUserId: req.params.userId,
        role,
      });
      res.status(200).json(toAdminSafeUser(toSafeUser(user)));
    } catch (error) {
      handleUserError(res, error, 400);
    }
  },
};
