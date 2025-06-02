import { Request, Response, NextFunction } from "express";
import { jwtService, type JwtPayload } from "@/services/jwtService";
import { userService } from "@/services/userService";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
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

    const user = await userService.getUserById(payload.userId);

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    next();
  } catch (error) {
    const err = error as Error;
    res.status(401).json({
      error: err.message,
    });
  }
};
