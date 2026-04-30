import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { obraSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { saveUploadedFile } from "@/lib/upload";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "obras:read");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};

  const obra = await prisma.obra.findFirst({
    where: { id, ...orgWhere },
    include: {
      _count: { select: { funcionarios: true, maquinarios: true, transacoes: true, documentos: true } },
      funcionarios: { where: { status: "ATIVO" }, take: 5, orderBy: { nome: "asc" } },
      maquinarios: { take: 5, orderBy: { nome: "asc" } },
      alertas: { where: { lido: false }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!obra) return notFoundResponse("Obra não encontrada");

  const [entradas, saidas] = await Promise.all([
    prisma.transacaoFinanceira.aggregate({
      where: { obraId: id, tipo: "ENTRADA", status: { not: "CANCELADO" } },
      _sum: { valor: true },
    }),
    prisma.transacaoFinanceira.aggregate({
      where: { obraId: id, tipo: "SAIDA", status: { not: "CANCELADO" } },
      _sum: { valor: true },
    }),
  ]);

  return successResponse({
    ...obra,
    totalEntradas: Number(entradas._sum.valor || 0),
    totalSaidas: Number(saidas._sum.valor || 0),
    saldoFinanceiro: Number(entradas._sum.valor || 0) - Number(saidas._sum.valor || 0),
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "obras:write");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const existing = await prisma.obra.findFirst({ where: { id, ...orgWhere } });
  if (!existing) return notFoundResponse("Obra não encontrada");

  try {
    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, unknown> = {};
    let fotoPath = existing.fotoPath;

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

    const obra = await prisma.obra.update({
      where: { id },
      data: {
        ...result.data,
        dataInicio: new Date(result.data.dataInicio),
        dataPrevisaoFim: new Date(result.data.dataPrevisaoFim),
        fotoPath,
      },
    });

    return successResponse(obra);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "obras:delete");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const existing = await prisma.obra.findFirst({ where: { id, ...orgWhere } });
  if (!existing) return notFoundResponse("Obra não encontrada");

  await prisma.obra.delete({ where: { id } });
  return successResponse({ deleted: true });
}
