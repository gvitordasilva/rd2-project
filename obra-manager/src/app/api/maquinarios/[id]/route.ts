import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { maquinarioSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { saveUploadedFile } from "@/lib/upload";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "maquinario:read");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};

  const maquinario = await prisma.maquinario.findFirst({
    where: { id, deletedAt: null, ...orgWhere },
    include: { obra: { select: { id: true, nome: true } } },
  });

  if (!maquinario) return notFoundResponse("Maquinário não encontrado");
  return successResponse(maquinario);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "maquinario:write");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const existing = await prisma.maquinario.findFirst({ where: { id, deletedAt: null, ...orgWhere } });
  if (!existing) return notFoundResponse("Maquinário não encontrado");

  try {
    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, unknown> = {};
    let contratoPath = existing.contratoPath;
    let fotoPath = existing.fotoPath;

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

    const maquinario = await prisma.maquinario.update({
      where: { id },
      data: {
        ...result.data,
        dataInicioLocacao: result.data.dataInicioLocacao ? new Date(result.data.dataInicioLocacao) : null,
        dataVencimentoLocacao: result.data.dataVencimentoLocacao ? new Date(result.data.dataVencimentoLocacao) : null,
        contratoPath,
        fotoPath,
      },
    });

    await logAudit({ user: auth.user, req, acao: "UPDATE", entidade: "Maquinario", entidadeId: id, dadosAntes: existing, dadosDepois: maquinario });

    return successResponse(maquinario);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "maquinario:delete");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const existing = await prisma.maquinario.findFirst({ where: { id, deletedAt: null, ...orgWhere } });
  if (!existing) return notFoundResponse("Maquinário não encontrado");

  await prisma.maquinario.update({ where: { id }, data: { deletedAt: new Date() } });

  await logAudit({ user: auth.user, req, acao: "DELETE", entidade: "Maquinario", entidadeId: id, dadosAntes: existing });

  return successResponse({ deleted: true });
}
