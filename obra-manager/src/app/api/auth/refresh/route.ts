import { NextRequest } from "next/server";
import { verifyRefreshToken, generateAccessToken, generateRefreshToken, setAuthCookies } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refresh_token")?.value;
  if (!refreshToken) return errorResponse("Token de atualização ausente", 401);

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return errorResponse("Token inválido ou expirado", 401);

  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    perfil: payload.perfil,
    organizationId: payload.organizationId ?? null,
    organizationNome: payload.organizationNome ?? null,
  };
  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  const response = successResponse({ accessToken: newAccessToken });
  setAuthCookies(response as unknown as Response, newAccessToken, newRefreshToken);
  return response;
}
