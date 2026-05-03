import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Math.min(Number(searchParams.get("pageSize") || 20), 100);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { organizationId: auth.user.organizationId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { titulo: { contains: search, mode: "insensitive" } },
      { cliente: { contains: search, mode: "insensitive" } },
      { nomeObra: { contains: search, mode: "insensitive" } },
    ];
  }

  const [orcamentos, total] = await Promise.all([
    prisma.orcamento.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    }),
    prisma.orcamento.count({ where }),
  ]);

  return successResponse({
    data: orcamentos,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
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
