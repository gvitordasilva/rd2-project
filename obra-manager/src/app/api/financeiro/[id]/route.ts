import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { transacaoSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "financeiro:read");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};

  const transacao = await prisma.transacaoFinanceira.findFirst({
    where: { id, ...orgWhere },
    include: { obra: { select: { id: true, nome: true } }, user: { select: { nome: true } } },
  });

  if (!transacao) return notFoundResponse("Transação não encontrada");
  return successResponse(transacao);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "financeiro:write");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const existing = await prisma.transacaoFinanceira.findFirst({ where: { id, ...orgWhere } });
  if (!existing) return notFoundResponse("Transação não encontrada");

  const data = await req.json();
  const result = transacaoSchema.safeParse(data);
  if (!result.success) {
    return errorResponse("Dados inválidos", 400, result.error.flatten());
  }

  const transacao = await prisma.transacaoFinanceira.update({
    where: { id },
    data: { ...result.data, data: new Date(result.data.data) },
  });

  return successResponse(transacao);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "financeiro:delete");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const existing = await prisma.transacaoFinanceira.findFirst({ where: { id, ...orgWhere } });
  if (!existing) return notFoundResponse("Transação não encontrada");

  await prisma.transacaoFinanceira.delete({ where: { id } });
  return successResponse({ deleted: true });
}
