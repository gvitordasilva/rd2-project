import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/rbac";
import { organizationSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, nome: true, email: true, perfil: true, ativo: true } },
      _count: { select: { obras: true, funcionarios: true } },
    },
  });

  if (!org) return notFoundResponse("Organização não encontrada");
  return successResponse(org);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) return notFoundResponse("Organização não encontrada");

  try {
    const data = await req.json();
    const result = organizationSchema.safeParse(data);
    if (!result.success) {
      return errorResponse("Dados inválidos", 400, result.error.flatten());
    }

    if (result.data.slug !== existing.slug) {
      const slugTaken = await prisma.organization.findUnique({ where: { slug: result.data.slug } });
      if (slugTaken) return errorResponse("Código já está em uso", 409);
    }

    const org = await prisma.organization.update({ where: { id }, data: result.data });
    return successResponse(org);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) return notFoundResponse("Organização não encontrada");

  await prisma.organization.delete({ where: { id } });
  return successResponse({ deleted: true });
}
