import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse } from "@/lib/api-response";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { toMoney, subMoney } from "@/lib/money";

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
    prisma.obra.count({ where: { ...orgFilter, deletedAt: null, status: { in: ["EM_ANDAMENTO", "PLANEJAMENTO"] } } }),
    prisma.obra.groupBy({ by: ["status"], where: { ...orgFilter, deletedAt: null }, _count: { _all: true } }),
    prisma.funcionario.count({ where: { ...orgFilter, deletedAt: null, status: "ATIVO" } }),
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

  // Fix N+1: fluxo mensal — dispara todos os 12 aggregates em paralelo
  const dates = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
  const monthQueries = dates.flatMap((date) => [
    prisma.transacaoFinanceira.aggregate({
      where: { ...orgFilter, tipo: "ENTRADA", status: { not: "CANCELADO" }, data: { gte: startOfMonth(date), lte: endOfMonth(date) } },
      _sum: { valor: true },
    }),
    prisma.transacaoFinanceira.aggregate({
      where: { ...orgFilter, tipo: "SAIDA", status: { not: "CANCELADO" }, data: { gte: startOfMonth(date), lte: endOfMonth(date) } },
      _sum: { valor: true },
    }),
  ]);
  const monthResults = await Promise.all(monthQueries);
  const fluxoMensal = dates.map((date, i) => ({
    mes: format(date, "MMM/yy"),
    entradas: toMoney(monthResults[i * 2]._sum.valor),
    saidas: toMoney(monthResults[i * 2 + 1]._sum.valor),
  }));

  // Fix N+1: top5 obras por gasto — 1 groupBy + 1 findMany (antes: 1 groupBy + N findUnique)
  const top5 = await prisma.transacaoFinanceira.groupBy({
    by: ["obraId"],
    where: { ...orgFilter, tipo: "SAIDA", status: { not: "CANCELADO" } },
    _sum: { valor: true },
    orderBy: { _sum: { valor: "desc" } },
    take: 5,
  });

  const top5Ids = top5.map((t) => t.obraId);
  const top5Obras = await prisma.obra.findMany({
    where: { id: { in: top5Ids } },
    select: { id: true, nome: true },
  });
  const obraMap = new Map(top5Obras.map((o) => [o.id, o.nome]));
  const top5ComNome = top5.map((item) => ({
    id: item.obraId,
    nome: obraMap.get(item.obraId) || "N/A",
    totalGasto: toMoney(item._sum.valor),
  }));

  const alertasRecentes = await prisma.alerta.findMany({
    where: { ...orgFilter, lido: false },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { obra: { select: { nome: true } } },
  });

  return successResponse({
    totalObrasAtivas: totalObras,
    totalFuncionarios,
    saldoConsolidado: subMoney(entradas._sum.valor, saidas._sum.valor),
    alertasPendentes,
    obrasPorStatus: obrasPorStatus.map((o) => ({ status: o.status, count: o._count._all })),
    fluxoMensal,
    top5ObrasPorGasto: top5ComNome,
    alertasRecentes,
  });
}
