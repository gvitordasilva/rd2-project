import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  const orcamentos = await prisma.orcamento.findMany({
    where: { organizationId: auth.user.organizationId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      titulo: true,
      cliente: true,
      nomeObra: true,
      area: true,
      status: true,
      margem: true,
      desconto: true,
      rows: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return successResponse(orcamentos);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  try {
    const body = await req.json();
    const orc = await prisma.orcamento.create({
      data: {
        titulo: body.titulo || "Novo Orçamento",
        organizationId: auth.user.organizationId,
        rows: [],
      },
    });
    return successResponse(orc, 201);
  } catch {
    return errorResponse("Erro ao criar orçamento", 500);
  }
}
