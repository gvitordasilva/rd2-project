import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";

// GET: fetch frequencias for a week/period
// Query params: obraId, dataInicio (YYYY-MM-DD), dataFim (YYYY-MM-DD)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obraId");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  if (!obraId || !dataInicio || !dataFim)
    return errorResponse("Parâmetros obrigatórios: obraId, dataInicio, dataFim", 400);

  try {
    const registros = await prisma.registroFrequencia.findMany({
      where: {
        organizationId: auth.user.organizationId,
        obraId,
        data: { gte: new Date(dataInicio), lte: new Date(dataFim) },
      },
      include: {
        funcionario: {
          select: {
            id: true,
            nome: true,
            cargo: true,
            tipo: true,
            valorPagamento: true,
            periodicidade: true,
            status: true,
          },
        },
      },
      orderBy: [{ data: "asc" }, { funcionarioId: "asc" }],
    });

    return successResponse(registros);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}

// POST: bulk upsert frequencias
// Body: { registros: Array<{ funcionarioId, obraId, data, periodo, horasExtras?, observacao? }> }
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  try {
    const { registros } = await req.json();
    if (!Array.isArray(registros)) return errorResponse("registros deve ser um array", 400);

    const results = await Promise.all(
      registros.map(
        (r: {
          funcionarioId: string;
          obraId: string;
          data: string;
          periodo: number;
          horasExtras?: number;
          observacao?: string;
        }) =>
          prisma.registroFrequencia.upsert({
            where: {
              funcionarioId_obraId_data: {
                funcionarioId: r.funcionarioId,
                obraId: r.obraId,
                data: new Date(r.data),
              },
            },
            create: {
              funcionarioId: r.funcionarioId,
              obraId: r.obraId,
              organizationId: auth.user.organizationId!,
              data: new Date(r.data),
              presente: r.periodo > 0,
              periodo: r.periodo,
              horasExtras: r.horasExtras ?? 0,
              observacao: r.observacao,
            },
            update: {
              presente: r.periodo > 0,
              periodo: r.periodo,
              horasExtras: r.horasExtras ?? 0,
              observacao: r.observacao,
            },
          })
      )
    );

    return successResponse(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}
