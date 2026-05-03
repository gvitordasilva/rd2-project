import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { maquinarioSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { saveUploadedFile } from "@/lib/upload";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "maquinario:read");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 20);
  const obraId = searchParams.get("obraId");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { deletedAt: null };
  if (auth.user.organizationId) where.organizationId = auth.user.organizationId;
  if (obraId) where.obraId = obraId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { nome: { contains: search, mode: "insensitive" } },
      { tipo: { contains: search, mode: "insensitive" } },
      { marca: { contains: search, mode: "insensitive" } },
    ];
  }

  const [maquinarios, total] = await Promise.all([
    prisma.maquinario.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { nome: "asc" },
      include: { obra: { select: { id: true, nome: true } } },
    }),
    prisma.maquinario.count({ where }),
  ]);

  return successResponse({
    data: maquinarios,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "maquinario:write");
  if (auth instanceof Response) return auth;

  if (!auth.user.organizationId) {
    return errorResponse("Super Admin não pode criar maquinários diretamente", 403);
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, unknown> = {};
    let contratoPath: string | null = null;
    let fotoPath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const contrato = formData.get("contrato") as File | null;
      const foto = formData.get("foto") as File | null;
      if (contrato && contrato.size > 0) {
        const uploaded = await saveUploadedFile(contrato, "contratos", "document");
        contratoPath = uploaded.path;
      }
      if (foto && foto.size > 0) {
        const uploaded = await saveUploadedFile(foto, "maquinarios", "image");
        fotoPath = uploaded.path;
      }
      formData.forEach((value, key) => {
        if (!["contrato", "foto"].includes(key)) data[key] = value;
      });
      if (data.valorLocacao) data.valorLocacao = Number(data.valorLocacao);
    } else {
      data = await req.json();
    }

    const result = maquinarioSchema.safeParse(data);
    if (!result.success) {
      return errorResponse("Dados inválidos", 400, result.error.flatten());
    }

    const maquinario = await prisma.maquinario.create({
      data: {
        ...result.data,
        dataInicioLocacao: result.data.dataInicioLocacao ? new Date(result.data.dataInicioLocacao) : null,
        dataVencimentoLocacao: result.data.dataVencimentoLocacao ? new Date(result.data.dataVencimentoLocacao) : null,
        contratoPath,
        fotoPath,
        organizationId: auth.user.organizationId,
      },
    });

    await logAudit({ user: auth.user, req, acao: "CREATE", entidade: "Maquinario", entidadeId: maquinario.id, dadosDepois: maquinario });

    return successResponse(maquinario, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}
