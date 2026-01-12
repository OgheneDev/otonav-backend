import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const ACCESS_EXPIRES_IN = "7d";
const REFRESH_EXPIRES_IN = "30d";

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion?: number;
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
  orgId?: string | null;
  role?: string | null;
}

export const signAccessToken = (payload: AccessTokenPayload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
};

export const signRefreshToken = (payload: RefreshTokenPayload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error("Invalid or expired token");
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
};
