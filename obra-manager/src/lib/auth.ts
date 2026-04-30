import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface JWTPayload {
  userId: string;
  email: string;
  perfil: string;
  organizationId: string | null;
  organizationNome: string | null;
  iat?: number;
  exp?: number;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  } as jwt.SignOptions);
}

export function generateRefreshToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(req: NextRequest): Promise<JWTPayload | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return verifyAccessToken(token);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (token) {
    return verifyAccessToken(token);
  }

  return null;
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
) {
  const isProd = process.env.NODE_ENV === "production";
  res.headers.append(
    "Set-Cookie",
    `access_token=${accessToken}; HttpOnly; ${isProd ? "Secure; " : ""}SameSite=Strict; Path=/; Max-Age=900`
  );
  res.headers.append(
    "Set-Cookie",
    `refresh_token=${refreshToken}; HttpOnly; ${isProd ? "Secure; " : ""}SameSite=Strict; Path=/; Max-Age=604800`
  );
}
