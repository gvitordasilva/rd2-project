import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const etapaUpdateSchema = z.object({
  nome: z.string().min(2).optional(),
  descricao: z.string().optional(),
  ordem: z.number().int().min(0).optional(),
  dataInicioPrev: z.string().nullable().optional(),
  dataFimPrev: z.string().nullable().optional(),
  dataInicioReal: z.string().nullable().optional(),
  dataFimReal: z.string().nullable().optional(),
  percentual: z.number().min(0).max(100).optional(),
  status: z.enum(["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA", "PARALISADA"]).optional(),
  valorPrevisto: z.number().positive().nullable().optional(),
  observacoes: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; etapaId: string }> }
) {
  const auth = await requireAuth(req, "obras:write");
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  const { etapaId } = await params;
  const existing = await prisma.etapaObra.findFirst({
    where: { id: etapaId, organizationId: auth.user.organizationId },
  });
  if (!existing) return errorResponse("Etapa não encontrada", 404);

  try {
    const body = await req.json();
    const result = etapaUpdateSchema.safeParse(body);
    if (!result.success) return errorResponse("Dados inválidos", 400, result.error.flatten());

    const { dataInicioPrev, dataFimPrev, dataInicioReal, dataFimReal, ...rest } = result.data;

    const etapa = await prisma.etapaObra.update({
      where: { id: etapaId },
      data: {
        ...rest,
        ...(dataInicioPrev !== undefined && { dataInicioPrev: dataInicioPrev ? new Date(dataInicioPrev) : null }),
        ...(dataFimPrev !== undefined && { dataFimPrev: dataFimPrev ? new Date(dataFimPrev) : null }),
        ...(dataInicioReal !== undefined && { dataInicioReal: dataInicioReal ? new Date(dataInicioReal) : null }),
        ...(dataFimReal !== undefined && { dataFimReal: dataFimReal ? new Date(dataFimReal) : null }),
      },
    });
    return successResponse(etapa);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Erro interno", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; etapaId: string }> }
) {
  const auth = await requireAuth(req, "obras:delete");
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  const { etapaId } = await params;
  const existing = await prisma.etapaObra.findFirst({
    where: { id: etapaId, organizationId: auth.user.organizationId },
  });
  if (!existing) return errorResponse("Etapa não encontrada", 404);

  await prisma.etapaObra.delete({ where: { id: etapaId } });
  return successResponse({ deleted: true });
}
