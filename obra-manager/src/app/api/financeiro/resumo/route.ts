import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse } from "@/lib/api-response";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "financeiro:read");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obraId");
  const meses = Number(searchParams.get("meses") || 6);

  const where: Record<string, unknown> = {};
  if (auth.user.organizationId) where.organizationId = auth.user.organizationId;
  if (obraId) where.obraId = obraId;

  const [totalEntradas, totalSaidas, saldoPendente] = await Promise.all([
    prisma.transacaoFinanceira.aggregate({
      where: { ...where, tipo: "ENTRADA", status: { not: "CANCELADO" } },
      _sum: { valor: true },
    }),
    prisma.transacaoFinanceira.aggregate({
      where: { ...where, tipo: "SAIDA", status: { not: "CANCELADO" } },
      _sum: { valor: true },
    }),
    prisma.transacaoFinanceira.aggregate({
      where: { ...where, tipo: "SAIDA", status: "PENDENTE" },
      _sum: { valor: true },
    }),
  ]);

  const fluxoMensal = [];
  for (let i = meses - 1; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const inicio = startOfMonth(date);
    const fim = endOfMonth(date);
    const monthWhere = { ...where, data: { gte: inicio, lte: fim } };

    const [ent, sai] = await Promise.all([
      prisma.transacaoFinanceira.aggregate({
        where: { ...monthWhere, tipo: "ENTRADA", status: { not: "CANCELADO" } },
        _sum: { valor: true },
      }),
      prisma.transacaoFinanceira.aggregate({
        where: { ...monthWhere, tipo: "SAIDA", status: { not: "CANCELADO" } },
        _sum: { valor: true },
      }),
    ]);

    fluxoMensal.push({
      mes: format(date, "MMM/yy"),
      entradas: Number(ent._sum.valor || 0),
      saidas: Number(sai._sum.valor || 0),
    });
  }

  const despesasPorCategoria = await prisma.transacaoFinanceira.groupBy({
    by: ["categoria"],
    where: { ...where, tipo: "SAIDA", status: { not: "CANCELADO" } },
    _sum: { valor: true },
    orderBy: { _sum: { valor: "desc" } },
  });

  return successResponse({
    totalEntradas: Number(totalEntradas._sum.valor || 0),
    totalSaidas: Number(totalSaidas._sum.valor || 0),
    saldo: Number(totalEntradas._sum.valor || 0) - Number(totalSaidas._sum.valor || 0),
    saldoPendente: Number(saldoPendente._sum.valor || 0),
    fluxoMensal,
    despesasPorCategoria: despesasPorCategoria.map((d) => ({
      categoria: d.categoria,
      total: Number(d._sum.valor || 0),
    })),
  });
}
