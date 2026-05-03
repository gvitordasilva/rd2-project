import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, generateAccessToken, generateRefreshToken, setAuthCookies } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return errorResponse("Dados inválidos", 400, result.error.flatten());
    }

    const { email, senha, orgSlug } = result.data;

    const rateLimitKey = `login:${ip}:${email.toLowerCase()}`;
    const { allowed, retryAfter } = checkRateLimit(rateLimitKey);
    if (!allowed) {
      return errorResponse(`Muitas tentativas. Tente novamente em ${retryAfter}s`, 429);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: { select: { id: true, nome: true, slug: true, ativo: true } } },
    });

    if (!user || !user.ativo) {
      return errorResponse("Credenciais inválidas", 401);
    }

    const valid = await verifyPassword(senha, user.senha);
    if (!valid) {
      return errorResponse("Credenciais inválidas", 401);
    }

    resetRateLimit(rateLimitKey);

    const REFRESH_EXPIRES_DAYS = 7;
    const refreshExpiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    if (user.perfil === "SUPER_ADMIN") {
      const payload = { userId: user.id, email: user.email, perfil: user.perfil, organizationId: null, organizationNome: null };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);
      await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: refreshExpiresAt } });
      const response = successResponse({
        user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil, organizationId: null, organizationNome: null },
        accessToken,
      });
      setAuthCookies(response, accessToken, refreshToken);
      return response;
    }

    if (!orgSlug) {
      return errorResponse("Código da organização é obrigatório", 400);
    }

    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org || !org.ativo) {
      return errorResponse("Organização não encontrada ou inativa", 401);
    }

    if (user.organizationId !== org.id) {
      return errorResponse("Credenciais inválidas", 401);
    }

    const payload = { userId: user.id, email: user.email, perfil: user.perfil, organizationId: org.id, organizationNome: org.nome };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: refreshExpiresAt } });

    const response = successResponse({
      user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil, organizationId: org.id, organizationNome: org.nome },
      accessToken,
    });
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch {
    return errorResponse("Erro interno do servidor", 500);
  }
}
