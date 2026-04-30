import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/rbac";
import { createOrgUserSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) return notFoundResponse("Organização não encontrada");

  const users = await prisma.user.findMany({
    where: { organizationId: id },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true, createdAt: true },
    orderBy: { nome: "asc" },
  });

  return successResponse(users);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) return notFoundResponse("Organização não encontrada");

  try {
    const data = await req.json();
    const result = createOrgUserSchema.safeParse(data);
    if (!result.success) {
      return errorResponse("Dados inválidos", 400, result.error.flatten());
    }

    const emailTaken = await prisma.user.findUnique({ where: { email: result.data.email.toLowerCase() } });
    if (emailTaken) return errorResponse("E-mail já cadastrado", 409);

    const senhaHash = await hashPassword(result.data.senha);
    const user = await prisma.user.create({
      data: {
        nome: result.data.nome,
        email: result.data.email.toLowerCase(),
        senha: senhaHash,
        perfil: result.data.perfil,
        organizationId: id,
      },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, createdAt: true },
    });

    return successResponse(user, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof Response) return auth;

  const { id: orgId } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return errorResponse("userId obrigatório", 400);

  const data = await req.json();
  const user = await prisma.user.update({
    where: { id: userId, organizationId: orgId },
    data: {
      ...(data.perfil ? { perfil: data.perfil } : {}),
      ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
    },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true },
  });

  return successResponse(user);
}
