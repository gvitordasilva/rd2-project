import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const etapaSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  ordem: z.number().int().min(0),
  dataInicioPrev: z.string().optional(),
  dataFimPrev: z.string().optional(),
  dataInicioReal: z.string().optional(),
  dataFimReal: z.string().optional(),
  percentual: z.number().min(0).max(100).default(0),
  status: z.enum(["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA", "PARALISADA"]).default("PENDENTE"),
  valorPrevisto: z.number().positive().optional(),
  observacoes: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "obras:read");
  if (auth instanceof Response) return auth;

  const { id: obraId } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};

  const obra = await prisma.obra.findFirst({ where: { id: obraId, deletedAt: null, ...orgWhere } });
  if (!obra) return errorResponse("Obra não encontrada", 404);

  const etapas = await prisma.etapaObra.findMany({
    where: { obraId, ...orgWhere },
    orderBy: { ordem: "asc" },
  });

  return successResponse(etapas);
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
    const result = etapaSchema.safeParse(body);
    if (!result.success) return errorResponse("Dados inválidos", 400, result.error.flatten());

    const { dataInicioPrev, dataFimPrev, dataInicioReal, dataFimReal, ...rest } = result.data;
    const etapa = await prisma.etapaObra.create({
      data: {
        ...rest,
        dataInicioPrev: dataInicioPrev ? new Date(dataInicioPrev) : undefined,
        dataFimPrev: dataFimPrev ? new Date(dataFimPrev) : undefined,
        dataInicioReal: dataInicioReal ? new Date(dataInicioReal) : undefined,
        dataFimReal: dataFimReal ? new Date(dataFimReal) : undefined,
        obraId,
        organizationId: auth.user.organizationId,
      },
    });
    return successResponse(etapa, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Erro interno", 500);
  }
}
