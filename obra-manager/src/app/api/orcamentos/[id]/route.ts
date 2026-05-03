import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);
  const { id } = await params;

  const orc = await prisma.orcamento.findFirst({
    where: { id, organizationId: auth.user.organizationId },
    include: { obra: { select: { id: true, nome: true, status: true } } },
  });
  if (!orc) return errorResponse("Não encontrado", 404);

  // Se vinculado a uma obra, retorna o realizado por categoria
  let realizado: Record<string, number> | null = null;
  if (orc.obraId) {
    const transacoes = await prisma.transacaoFinanceira.groupBy({
      by: ["categoria"],
      where: {
        obraId: orc.obraId,
        tipo: "SAIDA",
        status: { not: "CANCELADO" },
        organizationId: auth.user.organizationId,
      },
      _sum: { valor: true },
    });
    realizado = Object.fromEntries(
      transacoes.map((t) => [t.categoria, Number(t._sum.valor ?? 0)])
    );
  }

  return successResponse({ ...orc, realizado });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);
  const { id } = await params;

  try {
    const body = await req.json();
    const existing = await prisma.orcamento.findFirst({
      where: { id, organizationId: auth.user.organizationId },
    });
    if (!existing) return errorResponse("Não encontrado", 404);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _c, updatedAt: _u, organizationId: _o, ...data } = body;
    const updated = await prisma.orcamento.update({
      where: { id },
      data: { ...data, rows: body.rows ?? [] },
    });
    return successResponse(updated);
  } catch {
    return errorResponse("Erro ao salvar", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);
  const { id } = await params;

  const existing = await prisma.orcamento.findFirst({
    where: { id, organizationId: auth.user.organizationId },
  });
  if (!existing) return errorResponse("Não encontrado", 404);

  await prisma.orcamento.delete({ where: { id } });
  return successResponse({ ok: true });
}
