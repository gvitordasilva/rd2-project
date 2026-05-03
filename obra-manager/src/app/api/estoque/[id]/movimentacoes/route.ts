import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const movimentacaoSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA", "AJUSTE"]),
  quantidade: z.number().positive(),
  valorUnitario: z.number().positive().optional(),
  motivo: z.string().optional(),
  fornecedor: z.string().optional(),
  notaFiscal: z.string().optional(),
  responsavel: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "obras:read");
  if (auth instanceof Response) return auth;

  const { id: itemEstoqueId } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};

  const item = await prisma.itemEstoque.findFirst({ where: { id: itemEstoqueId, ...orgWhere } });
  if (!item) return errorResponse("Item não encontrado", 404);

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 30);

  const where: Record<string, unknown> = { itemEstoqueId, ...orgWhere };
  if (tipo) where.tipo = tipo;

  const [movimentacoes, total] = await Promise.all([
    prisma.movimentacaoEstoque.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { id: true, nome: true } } },
    }),
    prisma.movimentacaoEstoque.count({ where }),
  ]);

  return successResponse({ data: movimentacoes, total, page, pageSize });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "obras:write");
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  const { id: itemEstoqueId } = await params;
  const item = await prisma.itemEstoque.findFirst({
    where: { id: itemEstoqueId, organizationId: auth.user.organizationId },
  });
  if (!item) return errorResponse("Item não encontrado", 404);

  try {
    const body = await req.json();
    const result = movimentacaoSchema.safeParse(body);
    if (!result.success) return errorResponse("Dados inválidos", 400, result.error.flatten());

    const { tipo, quantidade } = result.data;

    // Valida saldo disponível para saídas
    if (tipo === "SAIDA") {
      const saldoAtual = Number(item.quantidadeAtual);
      if (quantidade > saldoAtual) {
        return errorResponse(`Saldo insuficiente. Disponível: ${saldoAtual} ${item.unidade}`, 422);
      }
    }

    // Atualiza quantidade e registra movimentação atomicamente
    const delta = tipo === "SAIDA" ? -quantidade : tipo === "ENTRADA" ? quantidade : 0;
    const novaQuantidade = tipo === "AJUSTE"
      ? quantidade
      : Number(item.quantidadeAtual) + delta;

    const [movimentacao] = await prisma.$transaction([
      prisma.movimentacaoEstoque.create({
        data: {
          ...result.data,
          itemEstoqueId,
          obraId: item.obraId,
          organizationId: auth.user.organizationId,
          userId: auth.user.userId,
        },
      }),
      prisma.itemEstoque.update({
        where: { id: itemEstoqueId },
        data: { quantidadeAtual: novaQuantidade },
      }),
    ]);

    return successResponse(movimentacao, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Erro interno", 500);
  }
}
