import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { funcionarioSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { saveUploadedFile } from "@/lib/upload";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "funcionarios:read");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 20);
  const obraId = searchParams.get("obraId");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (auth.user.organizationId) where.organizationId = auth.user.organizationId;
  if (obraId) where.obraId = obraId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { nome: { contains: search, mode: "insensitive" } },
      { cargo: { contains: search, mode: "insensitive" } },
      { cpf: { contains: search } },
    ];
  }

  const [funcionarios, total] = await Promise.all([
    prisma.funcionario.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { nome: "asc" },
      include: {
        obra: { select: { id: true, nome: true } },
        _count: { select: { pagamentos: true } },
      },
    }),
    prisma.funcionario.count({ where }),
  ]);

  return successResponse({
    data: funcionarios,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "funcionarios:write");
  if (auth instanceof Response) return auth;

  if (!auth.user.organizationId) {
    return errorResponse("Super Admin não pode criar funcionários diretamente", 403);
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, unknown> = {};
    let fotoPath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const foto = formData.get("foto") as File | null;
      if (foto && foto.size > 0) {
        const uploaded = await saveUploadedFile(foto, "funcionarios", "image");
        fotoPath = uploaded.path;
      }
      formData.forEach((value, key) => {
        if (key !== "foto") data[key] = value;
      });
      if (data.valorPagamento) data.valorPagamento = Number(data.valorPagamento);
    } else {
      data = await req.json();
    }

    const result = funcionarioSchema.safeParse(data);
    if (!result.success) {
      return errorResponse("Dados inválidos", 400, result.error.flatten());
    }

    const funcionario = await prisma.funcionario.create({
      data: {
        ...result.data,
        dataAdmissao: new Date(result.data.dataAdmissao),
        fotoPath,
        organizationId: auth.user.organizationId,
      },
    });

    return successResponse(funcionario, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}
