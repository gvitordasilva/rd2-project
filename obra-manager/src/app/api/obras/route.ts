import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { obraSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { saveUploadedFile } from "@/lib/upload";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "obras:read");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 20);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (auth.user.organizationId) where.organizationId = auth.user.organizationId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { nome: { contains: search, mode: "insensitive" } },
      { cliente: { contains: search, mode: "insensitive" } },
      { responsavel: { contains: search, mode: "insensitive" } },
    ];
  }

  const [obras, total] = await Promise.all([
    prisma.obra.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { funcionarios: true, maquinarios: true, transacoes: true } },
      },
    }),
    prisma.obra.count({ where }),
  ]);

  const obrasWithStats = await Promise.all(
    obras.map(async (obra) => {
      const [entradas, saidas] = await Promise.all([
        prisma.transacaoFinanceira.aggregate({
          where: { obraId: obra.id, tipo: "ENTRADA", status: { not: "CANCELADO" } },
          _sum: { valor: true },
        }),
        prisma.transacaoFinanceira.aggregate({
          where: { obraId: obra.id, tipo: "SAIDA", status: { not: "CANCELADO" } },
          _sum: { valor: true },
        }),
      ]);
      const totalEntradas = Number(entradas._sum.valor || 0);
      const totalSaidas = Number(saidas._sum.valor || 0);
      return { ...obra, totalEntradas, totalSaidas, saldoFinanceiro: totalEntradas - totalSaidas };
    })
  );

  return successResponse({
    data: obrasWithStats,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "obras:write");
  if (auth instanceof Response) return auth;

  if (!auth.user.organizationId) {
    return errorResponse("Super Admin não pode criar obras diretamente", 403);
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, unknown> = {};
    let fotoPath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const foto = formData.get("foto") as File | null;
      if (foto && foto.size > 0) {
        const uploaded = await saveUploadedFile(foto, "obras", "image");
        fotoPath = uploaded.path;
      }
      formData.forEach((value, key) => {
        if (key !== "foto") data[key] = value;
      });
      if (data.orcamentoPrevisto) data.orcamentoPrevisto = Number(data.orcamentoPrevisto);
    } else {
      data = await req.json();
    }

    const result = obraSchema.safeParse(data);
    if (!result.success) {
      return errorResponse("Dados inválidos", 400, result.error.flatten());
    }

    const obra = await prisma.obra.create({
      data: {
        ...result.data,
        dataInicio: new Date(result.data.dataInicio),
        dataPrevisaoFim: new Date(result.data.dataPrevisaoFim),
        fotoPath,
        userId: auth.user.userId,
        organizationId: auth.user.organizationId,
      },
    });

    return successResponse(obra, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}
