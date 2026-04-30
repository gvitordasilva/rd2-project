import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "documentos:read");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 20);
  const obraId = searchParams.get("obraId");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (auth.user.organizationId) where.organizationId = auth.user.organizationId;
  if (obraId) where.obraId = obraId;
  if (search) where.nome = { contains: search, mode: "insensitive" };

  const [documentos, total] = await Promise.all([
    prisma.documento.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        obra: { select: { nome: true } },
        user: { select: { nome: true } },
      },
    }),
    prisma.documento.count({ where }),
  ]);

  return successResponse({
    data: documentos,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
