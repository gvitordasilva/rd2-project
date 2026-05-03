import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const vinculoSchema = z.object({
  obraId: z.string().min(1),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  dataFim: z.string().optional(),
  funcao: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "funcionarios:read");
  if (auth instanceof Response) return auth;

  const { id: funcionarioId } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};

  const func = await prisma.funcionario.findFirst({
    where: { id: funcionarioId, deletedAt: null, ...orgWhere },
  });
  if (!func) return errorResponse("Funcionário não encontrado", 404);

  const vinculos = await prisma.funcionarioObra.findMany({
    where: { funcionarioId, ...orgWhere },
    include: { obra: { select: { id: true, nome: true, status: true, cidade: true } } },
    orderBy: { dataInicio: "desc" },
  });

  return successResponse(vinculos);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "funcionarios:write");
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  const { id: funcionarioId } = await params;
  const func = await prisma.funcionario.findFirst({
    where: { id: funcionarioId, deletedAt: null, organizationId: auth.user.organizationId },
  });
  if (!func) return errorResponse("Funcionário não encontrado", 404);

  try {
    const body = await req.json();
    const result = vinculoSchema.safeParse(body);
    if (!result.success) return errorResponse("Dados inválidos", 400, result.error.flatten());

    const obra = await prisma.obra.findFirst({
      where: { id: result.data.obraId, deletedAt: null, organizationId: auth.user.organizationId },
    });
    if (!obra) return errorResponse("Obra não encontrada", 404);

    const vinculo = await prisma.funcionarioObra.upsert({
      where: { funcionarioId_obraId: { funcionarioId, obraId: result.data.obraId } },
      create: {
        funcionarioId,
        obraId: result.data.obraId,
        organizationId: auth.user.organizationId,
        dataInicio: new Date(result.data.dataInicio),
        dataFim: result.data.dataFim ? new Date(result.data.dataFim) : undefined,
        funcao: result.data.funcao,
        ativo: true,
      },
      update: {
        dataInicio: new Date(result.data.dataInicio),
        dataFim: result.data.dataFim ? new Date(result.data.dataFim) : null,
        funcao: result.data.funcao,
        ativo: true,
      },
    });
    return successResponse(vinculo, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Erro interno", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "funcionarios:write");
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  const { id: funcionarioId } = await params;
  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obraId");
  if (!obraId) return errorResponse("obraId obrigatório", 400);

  const vinculo = await prisma.funcionarioObra.findFirst({
    where: { funcionarioId, obraId, organizationId: auth.user.organizationId },
  });
  if (!vinculo) return errorResponse("Vínculo não encontrado", 404);

  await prisma.funcionarioObra.delete({ where: { id: vinculo.id } });
  return successResponse({ deleted: true });
}
