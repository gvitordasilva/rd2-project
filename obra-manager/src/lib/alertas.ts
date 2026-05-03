import { prisma } from "./prisma";
import { AlertaTipo } from "@/generated/prisma";
import { addDays, differenceInDays } from "date-fns";

type AlertaInput = {
  tipo: AlertaTipo;
  mensagem: string;
  obraId: string;
  organizationId: string;
  entidadeId?: string;
  entidadeTipo?: string;
  dataExpiracao?: Date;
};

export async function verificarEGerarAlertas(organizationId?: string | null) {
  const hoje = new Date();
  const orgFilter = organizationId ? { organizationId } : {};
  const ontemRef = addDays(hoje, -1);

  // Busca todos os alertas ativos das últimas 24h em uma única query (elimina N+1)
  const alertasExistentes = await prisma.alerta.findMany({
    where: { ...orgFilter, lido: false, createdAt: { gte: ontemRef } },
    select: { tipo: true, entidadeId: true, obraId: true },
  });
  const alertaSet = new Set(
    alertasExistentes.map((a) => `${a.tipo}|${a.entidadeId ?? a.obraId}`)
  );

  const novosAlertas: AlertaInput[] = [];

  // ── 1. Vencimento de locação de maquinários ─────────────────────────────
  const maquinariosLocados = await prisma.maquinario.findMany({
    where: {
      ...orgFilter,
      deletedAt: null,
      status: "LOCADO",
      dataVencimentoLocacao: { not: null, gte: hoje },
    },
  });

  for (const maq of maquinariosLocados) {
    if (!maq.dataVencimentoLocacao) continue;
    const diasRestantes = differenceInDays(maq.dataVencimentoLocacao, hoje);
    if (diasRestantes <= 7 && !alertaSet.has(`VENCIMENTO_LOCACAO|${maq.id}`)) {
      novosAlertas.push({
        tipo: AlertaTipo.VENCIMENTO_LOCACAO,
        mensagem: `Locação de "${maq.nome}" vence em ${diasRestantes} dia(s)`,
        obraId: maq.obraId,
        organizationId: maq.organizationId,
        entidadeId: maq.id,
        entidadeTipo: "MAQUINARIO",
        dataExpiracao: addDays(maq.dataVencimentoLocacao, 1),
      });
    }
  }

  // ── 2. Pagamentos de funcionários ────────────────────────────────────────
  const funcionarios = await prisma.funcionario.findMany({
    where: { ...orgFilter, deletedAt: null, status: "ATIVO" },
    include: {
      pagamentos: { orderBy: { dataPagamento: "desc" }, take: 1 },
    },
  });

  for (const func of funcionarios) {
    const ultimoPagamento = func.pagamentos[0];
    if (!ultimoPagamento) continue;

    const diasMap: Record<string, number> = {
      DIARIO: 1, SEMANAL: 7, QUINZENAL: 15, MENSAL: 30,
    };
    const proximoPagamento = addDays(ultimoPagamento.dataPagamento, diasMap[func.periodicidade] ?? 30);
    const diasRestantes = differenceInDays(proximoPagamento, hoje);

    if (diasRestantes <= 3 && !alertaSet.has(`PAGAMENTO_FUNCIONARIO|${func.id}`)) {
      const msg =
        diasRestantes < 0
          ? `Pagamento de "${func.nome}" está em atraso (${Math.abs(diasRestantes)} dia(s))`
          : `Pagamento de "${func.nome}" vence em ${diasRestantes} dia(s)`;
      novosAlertas.push({
        tipo: AlertaTipo.PAGAMENTO_FUNCIONARIO,
        mensagem: msg,
        obraId: func.obraId,
        organizationId: func.organizationId,
        entidadeId: func.id,
        entidadeTipo: "FUNCIONARIO",
      });
    }
  }

  // ── 3. Prazo de obras ────────────────────────────────────────────────────
  const obrasComPrazo = await prisma.obra.findMany({
    where: {
      ...orgFilter,
      deletedAt: null,
      status: { in: ["EM_ANDAMENTO", "PLANEJAMENTO"] },
      dataPrevisaoFim: { gte: hoje, lte: addDays(hoje, 7) },
    },
  });

  for (const obra of obrasComPrazo) {
    const diasRestantes = differenceInDays(obra.dataPrevisaoFim, hoje);
    if (!alertaSet.has(`PRAZO_OBRA|${obra.id}`)) {
      novosAlertas.push({
        tipo: AlertaTipo.PRAZO_OBRA,
        mensagem: `Obra "${obra.nome}" tem prazo em ${diasRestantes} dia(s)`,
        obraId: obra.id,
        organizationId: obra.organizationId,
        entidadeTipo: "OBRA",
      });
    }
  }

  // ── 4. Despesas pendentes há mais de 7 dias ──────────────────────────────
  const despesasPendentes = await prisma.transacaoFinanceira.findMany({
    where: {
      ...orgFilter,
      tipo: "SAIDA",
      status: "PENDENTE",
      data: { lte: addDays(hoje, -7) },
    },
  });

  for (const desp of despesasPendentes) {
    if (!alertaSet.has(`DESPESA_PENDENTE|${desp.id}`)) {
      novosAlertas.push({
        tipo: AlertaTipo.DESPESA_PENDENTE,
        mensagem: `Despesa "${desp.descricao}" está pendente há mais de 7 dias`,
        obraId: desp.obraId,
        organizationId: desp.organizationId,
        entidadeId: desp.id,
        entidadeTipo: "TRANSACAO",
      });
    }
  }

  // Batch insert — uma única query para todos os novos alertas
  if (novosAlertas.length > 0) {
    await prisma.alerta.createMany({ data: novosAlertas });
  }

  return { success: true, criados: novosAlertas.length, timestamp: new Date().toISOString() };
}
