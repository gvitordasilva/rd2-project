import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken, generateAccessToken, generateRefreshToken, setAuthCookies } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refresh_token")?.value;
  if (!refreshToken) return errorResponse("Token de atualização ausente", 401);

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return errorResponse("Token inválido ou expirado", 401);

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
    return errorResponse("Token inválido ou expirado", 401);
  }

  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    perfil: payload.perfil,
    organizationId: payload.organizationId ?? null,
    organizationNome: payload.organizationNome ?? null,
  };
  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  const REFRESH_EXPIRES_DAYS = 7;
  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { token: refreshToken } }),
    prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: payload.userId, expiresAt: new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000) },
    }),
  ]);

  const response = successResponse({ accessToken: newAccessToken });
  setAuthCookies(response as unknown as Response, newAccessToken, newRefreshToken);
  return response;
}
