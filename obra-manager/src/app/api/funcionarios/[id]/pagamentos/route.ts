import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { pagamentoSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { saveUploadedFile } from "@/lib/upload";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "funcionarios:read");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const pagamentos = await prisma.pagamento.findMany({
    where: { funcionarioId: id },
    orderBy: { dataPagamento: "desc" },
  });

  return successResponse(pagamentos);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "funcionarios:write");
  if (auth instanceof Response) return auth;

  if (!auth.user.organizationId) {
    return errorResponse("Super Admin não pode registrar pagamentos diretamente", 403);
  }

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const funcionario = await prisma.funcionario.findFirst({ where: { id, ...orgWhere } });
  if (!funcionario) return notFoundResponse("Funcionário não encontrado");

  try {
    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, unknown> = { funcionarioId: id };
    let comprovantePath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const comprovante = formData.get("comprovante") as File | null;
      if (comprovante && comprovante.size > 0) {
        const uploaded = await saveUploadedFile(comprovante, "pagamentos", "document");
        comprovantePath = uploaded.path;
      }
      formData.forEach((value, key) => {
        if (key !== "comprovante") data[key] = value;
      });
      if (data.valor) data.valor = Number(data.valor);
    } else {
      const body = await req.json();
      data = { ...body, funcionarioId: id };
    }

    const result = pagamentoSchema.safeParse(data);
    if (!result.success) {
      return errorResponse("Dados inválidos", 400, result.error.flatten());
    }

    const pagamento = await prisma.pagamento.create({
      data: {
        ...result.data,
        dataPagamento: new Date(result.data.dataPagamento),
        comprovantePath,
        organizationId: auth.user.organizationId,
      },
    });

    return successResponse(pagamento, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}
