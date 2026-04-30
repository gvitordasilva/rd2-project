import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "alertas:read");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obraId");
  const lido = searchParams.get("lido");
  const tipo = searchParams.get("tipo");

  const where: Record<string, unknown> = {};
  if (auth.user.organizationId) where.organizationId = auth.user.organizationId;
  if (obraId) where.obraId = obraId;
  if (lido !== null && lido !== undefined) where.lido = lido === "true";
  if (tipo) where.tipo = tipo;

  const alertas = await prisma.alerta.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { obra: { select: { nome: true } } },
  });

  const totalNaoLidos = await prisma.alerta.count({
    where: {
      lido: false,
      ...(auth.user.organizationId ? { organizationId: auth.user.organizationId } : {}),
    },
  });

  return successResponse({ data: alertas, totalNaoLidos });
}
