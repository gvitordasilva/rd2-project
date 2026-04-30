import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { createOrgUserSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "usuarios:manage");
  if (auth instanceof Response) return auth;

  if (!auth.user.organizationId) return errorResponse("Acesso negado", 403);

  const users = await prisma.user.findMany({
    where: { organizationId: auth.user.organizationId },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true, createdAt: true },
    orderBy: { nome: "asc" },
  });

  return successResponse(users);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "usuarios:manage");
  if (auth instanceof Response) return auth;

  if (!auth.user.organizationId) return errorResponse("Acesso negado", 403);

  const data = await req.json();
  const result = createOrgUserSchema.safeParse(data);
  if (!result.success) return errorResponse("Dados inválidos", 400, result.error.flatten());

  const emailTaken = await prisma.user.findUnique({ where: { email: result.data.email.toLowerCase() } });
  if (emailTaken) return errorResponse("E-mail já cadastrado", 409);

  const senhaHash = await hashPassword(result.data.senha);
  const user = await prisma.user.create({
    data: {
      nome: result.data.nome,
      email: result.data.email.toLowerCase(),
      senha: senhaHash,
      perfil: result.data.perfil,
      organizationId: auth.user.organizationId,
    },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true, createdAt: true },
  });

  return successResponse(user, 201);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, "usuarios:manage");
  if (auth instanceof Response) return auth;

  if (!auth.user.organizationId) return errorResponse("Acesso negado", 403);

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return errorResponse("userId obrigatório", 400);

  // Cannot modify self
  if (userId === auth.user.userId) return errorResponse("Não é possível modificar o próprio usuário", 400);

  const data = await req.json();
  const user = await prisma.user.update({
    where: { id: userId, organizationId: auth.user.organizationId },
    data: {
      ...(data.perfil ? { perfil: data.perfil } : {}),
      ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
    },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true },
  });

  return successResponse(user);
}
