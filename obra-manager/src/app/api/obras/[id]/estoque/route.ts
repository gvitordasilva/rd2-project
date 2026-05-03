import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const itemEstoqueSchema = z.object({
  nome: z.string().min(2),
  unidade: z.string().min(1),
  categoria: z.string().optional(),
  quantidadeAtual: z.number().min(0).default(0),
  quantidadeMinima: z.number().min(0).optional(),
  valorUnitario: z.number().positive().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "obras:read");
  if (auth instanceof Response) return auth;

  const { id: obraId } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};

  const obra = await prisma.obra.findFirst({ where: { id: obraId, deletedAt: null, ...orgWhere } });
  if (!obra) return errorResponse("Obra não encontrada", 404);

  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { obraId, ...orgWhere };
  if (categoria) where.categoria = categoria;
  if (search) {
    where.OR = [
      { nome: { contains: search, mode: "insensitive" } },
      { categoria: { contains: search, mode: "insensitive" } },
    ];
  }

  const itens = await prisma.itemEstoque.findMany({
    where,
    orderBy: [{ categoria: "asc" }, { nome: "asc" }],
    include: { _count: { select: { movimentacoes: true } } },
  });

  return successResponse(itens);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "obras:write");
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  const { id: obraId } = await params;
  const obra = await prisma.obra.findFirst({
    where: { id: obraId, deletedAt: null, organizationId: auth.user.organizationId },
  });
  if (!obra) return errorResponse("Obra não encontrada", 404);

  try {
    const body = await req.json();
    const result = itemEstoqueSchema.safeParse(body);
    if (!result.success) return errorResponse("Dados inválidos", 400, result.error.flatten());

    const item = await prisma.itemEstoque.create({
      data: {
        ...result.data,
        obraId,
        organizationId: auth.user.organizationId,
      },
    });
    return successResponse(item, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Erro interno", 500);
  }
}
