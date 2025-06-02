import { Request, Response } from "express";
import {
  userService,
  type CreateUserParams,
  type UpdateUserParams,
  type LoginParams,
} from "@/services/userService";
import type { PrismaUser } from "@/types";

const createSafeUserResponse = (user: PrismaUser) => {
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
};

export const userController = {
  getUserById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          error: "User ID is required",
        });
        return;
      }

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
      const userParams: CreateUserParams = req.body;

      if (!userParams) {
        res.status(400).json({
          error: "User data is required",
        });
        return;
      }

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

  updateUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const updateData: UpdateUserParams = req.body;

      if (!userId) {
        res.status(400).json({
          error: "User ID is required",
        });
        return;
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        res.status(400).json({
          error: "Update data is required",
        });
        return;
      }

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
      const loginParams: LoginParams = req.body;

      if (!loginParams) {
        res.status(400).json({
          error: "Login data is required",
        });
        return;
      }

      const authResponse = await userService.login(
        loginParams.email,
        loginParams.password,
      );

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
};
