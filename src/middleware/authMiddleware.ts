// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { ParamsDictionary } from "express-serve-static-core";
import { Request, Response, NextFunction } from "express";
import { jwtService, type JwtPayload } from "@/services/jwtService";
import {
  userService,
  UserServiceError,
  type UserApplicationRole,
  type UserLifecycleStatus,
} from "@/services/userService";

export interface AuthenticatedRequest<P = ParamsDictionary> extends Request<P> {
  user?: {
    id: string;
    name: string;
    email: string;
    status: UserLifecycleStatus;
    role: UserApplicationRole;
    createdAt: Date;
    updatedAt: Date;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);
    const payload: JwtPayload = jwtService.verifyToken(token);

    const user = userService.assertActiveUser(
      await userService.getUserById(payload.userId),
    );

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    next();
  } catch (error) {
    const err = error as Error;
    const statusCode =
      error instanceof UserServiceError ? error.statusCode : 401;

    res.status(statusCode).json({
      error: err.message,
    });
  }
};

export const requireRole = (role: UserApplicationRole) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({
        error: "User is not authenticated",
      });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({
        error: "Admin access is required",
      });
      return;
    }

    next();
  };
};
