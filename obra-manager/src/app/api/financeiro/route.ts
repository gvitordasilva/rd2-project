import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { transacaoSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { saveUploadedFile } from "@/lib/upload";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "financeiro:read");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 20);
  const obraId = searchParams.get("obraId");
  const tipo = searchParams.get("tipo");
  const status = searchParams.get("status");
  const categoria = searchParams.get("categoria");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const where: Record<string, unknown> = {};
  if (auth.user.organizationId) where.organizationId = auth.user.organizationId;
  if (obraId) where.obraId = obraId;
  if (tipo) where.tipo = tipo;
  if (status) where.status = status;
  if (categoria) where.categoria = categoria;
  if (dataInicio || dataFim) {
    where.data = {};
    if (dataInicio) (where.data as Record<string, unknown>).gte = new Date(dataInicio);
    if (dataFim) (where.data as Record<string, unknown>).lte = new Date(dataFim);
  }

  const [transacoes, total] = await Promise.all([
    prisma.transacaoFinanceira.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { data: "desc" },
      include: { obra: { select: { id: true, nome: true } }, user: { select: { nome: true } } },
    }),
    prisma.transacaoFinanceira.count({ where }),
  ]);

  return successResponse({
    data: transacoes,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "financeiro:write");
  if (auth instanceof Response) return auth;

  if (!auth.user.organizationId) {
    return errorResponse("Super Admin não pode criar transações diretamente", 403);
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, unknown> = {};
    let arquivoPath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const arquivo = formData.get("arquivo") as File | null;
      if (arquivo && arquivo.size > 0) {
        const uploaded = await saveUploadedFile(arquivo, "financeiro", "document");
        arquivoPath = uploaded.path;
      }
      formData.forEach((value, key) => {
        if (key !== "arquivo") data[key] = value;
      });
      if (data.valor) data.valor = Number(data.valor);
    } else {
      data = await req.json();
    }

    const result = transacaoSchema.safeParse(data);
    if (!result.success) {
      return errorResponse("Dados inválidos", 400, result.error.flatten());
    }

    const transacao = await prisma.transacaoFinanceira.create({
      data: {
        ...result.data,
        data: new Date(result.data.data),
        arquivoPath,
        userId: auth.user.userId,
        organizationId: auth.user.organizationId,
      },
    });

    return successResponse(transacao, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}
