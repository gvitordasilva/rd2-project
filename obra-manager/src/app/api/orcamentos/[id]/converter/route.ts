import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const converterSchema = z.object({
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  dataPrevisaoFim: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  responsavel: z.string().min(3).optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().length(2).optional(),
  cep: z.string().optional(),
  bairro: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "obras:write");
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  const { id } = await params;
  const orcamento = await prisma.orcamento.findFirst({
    where: { id, organizationId: auth.user.organizationId },
  });
  if (!orcamento) return errorResponse("Orçamento não encontrado", 404);
  if (orcamento.obraId) return errorResponse("Orçamento já está vinculado a uma obra", 409);

  try {
    const body = await req.json();
    const result = converterSchema.safeParse(body);
    if (!result.success) return errorResponse("Dados inválidos", 400, result.error.flatten());

    // Calcula valor total do orçamento para usar como orcamentoPrevisto
    const rows = orcamento.rows as Array<{ total?: number; unitario?: number; quantidade?: number }>;
    const subtotal = rows.reduce((acc, r) => acc + (r.total ?? (r.unitario ?? 0) * (r.quantidade ?? 0)), 0);
    const valorComMargem = subtotal * (1 + (orcamento.margem ?? 0) / 100) * (1 - (orcamento.desconto ?? 0) / 100);

    const obra = await prisma.$transaction(async (tx) => {
      const novaObra = await tx.obra.create({
        data: {
          nome: orcamento.nomeObra || orcamento.titulo,
          cliente: orcamento.cliente || "A definir",
          responsavel: result.data.responsavel || orcamento.responsavel || "A definir",
          endereco: result.data.endereco || orcamento.endereco || "A definir",
          cidade: result.data.cidade || "A definir",
          estado: result.data.estado || "SP",
          cep: result.data.cep || "00000-000",
          bairro: result.data.bairro,
          dataInicio: new Date(result.data.dataInicio),
          dataPrevisaoFim: new Date(result.data.dataPrevisaoFim),
          status: "PLANEJAMENTO",
          orcamentoPrevisto: valorComMargem > 0 ? valorComMargem : undefined,
          organizationId: auth.user.organizationId!,
          userId: auth.user.userId,
        },
      });

      await tx.orcamento.update({
        where: { id },
        data: { obraId: novaObra.id, status: "APROVADO" },
      });

      return novaObra;
    });

    await logAudit({
      user: auth.user,
      req,
      acao: "CREATE",
      entidade: "Obra",
      entidadeId: obra.id,
      dadosDepois: { ...obra, fromOrcamento: id },
    });

    return successResponse(obra, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Erro interno", 500);
  }
}
