import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: number;
  email: string;
}

export interface AuthResponse {
  user: {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = "15m"; // Short-lived access token
const REFRESH_TOKEN_EXPIRES_IN = "7d"; // Long-lived refresh token

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export const jwtService = {
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
  },

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign({ ...payload, type: "refresh" }, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
  },

  // Legacy method for backward compatibility
  generateToken(payload: JwtPayload): string {
    return this.generateAccessToken(payload);
  },

  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
        type?: string;
      };

      // Remove the type field before returning
      const { type: _, ...payload } = decoded;
      return payload as JwtPayload;
    } catch {
      throw new Error("Invalid or expired token");
    }
  },

  verifyRefreshToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
        type?: string;
      };

      if (decoded.type !== "refresh") {
        throw new Error("Invalid refresh token");
      }

      // Remove the type field before returning
      const { type: _, ...payload } = decoded;
      return payload as JwtPayload;
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid refresh token") {
        throw error;
      }
      throw new Error("Invalid or expired refresh token");
    }
  },

  generateTokenPair(payload: JwtPayload): {
    accessToken: string;
    refreshToken: string;
  } {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  },

  extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new Error("Authorization header is required");
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Authorization header must start with 'Bearer '");
    }

    const token = authHeader.slice(7);
    if (!token) {
      throw new Error("Token is required");
    }

    return token;
  },
};
