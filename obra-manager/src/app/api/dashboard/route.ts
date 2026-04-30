import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse } from "@/lib/api-response";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "obras:read");
  if (auth instanceof Response) return auth;

  const orgFilter = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};

  const [
    totalObras,
    obrasPorStatus,
    totalFuncionarios,
    alertasPendentes,
    entradas,
    saidas,
  ] = await Promise.all([
    prisma.obra.count({ where: { ...orgFilter, status: { in: ["EM_ANDAMENTO", "PLANEJAMENTO"] } } }),
    prisma.obra.groupBy({ by: ["status"], where: orgFilter, _count: { _all: true } }),
    prisma.funcionario.count({ where: { ...orgFilter, status: "ATIVO" } }),
    prisma.alerta.count({ where: { ...orgFilter, lido: false } }),
    prisma.transacaoFinanceira.aggregate({
      where: { ...orgFilter, tipo: "ENTRADA", status: { not: "CANCELADO" } },
      _sum: { valor: true },
    }),
    prisma.transacaoFinanceira.aggregate({
      where: { ...orgFilter, tipo: "SAIDA", status: { not: "CANCELADO" } },
      _sum: { valor: true },
    }),
  ]);

  const fluxoMensal = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const inicio = startOfMonth(date);
    const fim = endOfMonth(date);

    const [ent, sai] = await Promise.all([
      prisma.transacaoFinanceira.aggregate({
        where: { ...orgFilter, tipo: "ENTRADA", status: { not: "CANCELADO" }, data: { gte: inicio, lte: fim } },
        _sum: { valor: true },
      }),
      prisma.transacaoFinanceira.aggregate({
        where: { ...orgFilter, tipo: "SAIDA", status: { not: "CANCELADO" }, data: { gte: inicio, lte: fim } },
        _sum: { valor: true },
      }),
    ]);

    fluxoMensal.push({
      mes: format(date, "MMM/yy"),
      entradas: Number(ent._sum.valor || 0),
      saidas: Number(sai._sum.valor || 0),
    });
  }

  const top5 = await prisma.transacaoFinanceira.groupBy({
    by: ["obraId"],
    where: { ...orgFilter, tipo: "SAIDA", status: { not: "CANCELADO" } },
    _sum: { valor: true },
    orderBy: { _sum: { valor: "desc" } },
    take: 5,
  });

  const top5ComNome = await Promise.all(
    top5.map(async (item) => {
      const obra = await prisma.obra.findUnique({
        where: { id: item.obraId },
        select: { nome: true },
      });
      return { id: item.obraId, nome: obra?.nome || "N/A", totalGasto: Number(item._sum.valor || 0) };
    })
  );

  const alertasRecentes = await prisma.alerta.findMany({
    where: { ...orgFilter, lido: false },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { obra: { select: { nome: true } } },
  });

  return successResponse({
    totalObrasAtivas: totalObras,
    totalFuncionarios,
    saldoConsolidado: Number(entradas._sum.valor || 0) - Number(saidas._sum.valor || 0),
    alertasPendentes,
    obrasPorStatus: obrasPorStatus.map((o) => ({ status: o.status, count: o._count._all })),
    fluxoMensal,
    top5ObrasPorGasto: top5ComNome,
    alertasRecentes,
  });
}
