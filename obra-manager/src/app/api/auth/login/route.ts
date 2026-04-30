import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, generateAccessToken, generateRefreshToken, setAuthCookies } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return errorResponse("Dados inválidos", 400, result.error.flatten());
    }

    const { email, senha, orgSlug } = result.data;

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

    if (user.perfil === "SUPER_ADMIN") {
      // Super admin: does not belong to any org
      const payload = {
        userId: user.id,
        email: user.email,
        perfil: user.perfil,
        organizationId: null,
        organizationNome: null,
      };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);
      const response = successResponse({
        user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil, organizationId: null, organizationNome: null },
        accessToken,
      });
      setAuthCookies(response, accessToken, refreshToken);
      return response;
    }

    // Regular users must provide org slug
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

    const payload = {
      userId: user.id,
      email: user.email,
      perfil: user.perfil,
      organizationId: org.id,
      organizationNome: org.nome,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const response = successResponse({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        organizationId: org.id,
        organizationNome: org.nome,
      },
      accessToken,
    });

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch {
    return errorResponse("Erro interno do servidor", 500);
  }
}
