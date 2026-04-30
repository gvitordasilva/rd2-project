import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { funcionarioSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { saveUploadedFile } from "@/lib/upload";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "funcionarios:read");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};

  const funcionario = await prisma.funcionario.findFirst({
    where: { id, ...orgWhere },
    include: {
      obra: { select: { id: true, nome: true } },
      pagamentos: { orderBy: { dataPagamento: "desc" }, take: 20 },
    },
  });

  if (!funcionario) return notFoundResponse("Funcionário não encontrado");
  return successResponse(funcionario);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "funcionarios:write");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const existing = await prisma.funcionario.findFirst({ where: { id, ...orgWhere } });
  if (!existing) return notFoundResponse("Funcionário não encontrado");

  try {
    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, unknown> = {};
    let fotoPath = existing.fotoPath;

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

    const funcionario = await prisma.funcionario.update({
      where: { id },
      data: { ...result.data, dataAdmissao: new Date(result.data.dataAdmissao), fotoPath },
    });

    return successResponse(funcionario);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "funcionarios:delete");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const existing = await prisma.funcionario.findFirst({ where: { id, ...orgWhere } });
  if (!existing) return notFoundResponse("Funcionário não encontrado");

  await prisma.funcionario.delete({ where: { id } });
  return successResponse({ deleted: true });
}
