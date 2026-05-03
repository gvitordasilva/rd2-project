import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  nome: z.string().min(2).optional(),
  unidade: z.string().min(1).optional(),
  categoria: z.string().optional(),
  quantidadeMinima: z.number().min(0).nullable().optional(),
  valorUnitario: z.number().positive().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "obras:read");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};

  const item = await prisma.itemEstoque.findFirst({
    where: { id, ...orgWhere },
    include: {
      movimentacoes: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { id: true, nome: true } } },
      },
    },
  });
  if (!item) return errorResponse("Item não encontrado", 404);
  return successResponse(item);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "obras:write");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const existing = await prisma.itemEstoque.findFirst({ where: { id, ...orgWhere } });
  if (!existing) return errorResponse("Item não encontrado", 404);

  try {
    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) return errorResponse("Dados inválidos", 400, result.error.flatten());

    const item = await prisma.itemEstoque.update({ where: { id }, data: result.data });
    return successResponse(item);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Erro interno", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "obras:delete");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const existing = await prisma.itemEstoque.findFirst({ where: { id, ...orgWhere } });
  if (!existing) return errorResponse("Item não encontrado", 404);

  await prisma.itemEstoque.delete({ where: { id } });
  return successResponse({ deleted: true });
}
