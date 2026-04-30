import { prisma } from "./prisma";
import { addDays, differenceInDays } from "date-fns";

export async function verificarEGerarAlertas(organizationId?: string | null) {
  const hoje = new Date();
  const orgFilter = organizationId ? { organizationId } : {};

  const maquinariosLocados = await prisma.maquinario.findMany({
    where: {
      ...orgFilter,
      status: "LOCADO",
      dataVencimentoLocacao: { not: null, gte: hoje },
    },
    include: { obra: { select: { id: true, nome: true } } },
  });

  for (const maq of maquinariosLocados) {
    if (!maq.dataVencimentoLocacao) continue;
    const diasRestantes = differenceInDays(maq.dataVencimentoLocacao, hoje);

    if (diasRestantes <= 7) {
      const jaExiste = await prisma.alerta.findFirst({
        where: {
          tipo: "VENCIMENTO_LOCACAO",
          entidadeId: maq.id,
          lido: false,
          createdAt: { gte: addDays(hoje, -1) },
        },
      });
      if (!jaExiste) {
        await prisma.alerta.create({
          data: {
            tipo: "VENCIMENTO_LOCACAO",
            mensagem: `Locação de "${maq.nome}" vence em ${diasRestantes} dia(s)`,
            obraId: maq.obraId,
            organizationId: maq.organizationId,
            entidadeId: maq.id,
            entidadeTipo: "MAQUINARIO",
            dataExpiracao: addDays(maq.dataVencimentoLocacao, 1),
          },
        });
      }
    }
  }

  const funcionarios = await prisma.funcionario.findMany({
    where: { ...orgFilter, status: "ATIVO" },
    include: {
      obra: { select: { id: true, nome: true } },
      pagamentos: { orderBy: { dataPagamento: "desc" }, take: 1 },
    },
  });

  for (const func of funcionarios) {
    const ultimoPagamento = func.pagamentos[0];
    if (!ultimoPagamento) continue;

    let diasParaProximo = 0;
    switch (func.periodicidade) {
      case "DIARIO": diasParaProximo = 1; break;
      case "SEMANAL": diasParaProximo = 7; break;
      case "QUINZENAL": diasParaProximo = 15; break;
      case "MENSAL": diasParaProximo = 30; break;
    }

    const proximoPagamento = addDays(ultimoPagamento.dataPagamento, diasParaProximo);
    const diasRestantes = differenceInDays(proximoPagamento, hoje);

    if (diasRestantes <= 3) {
      const jaExiste = await prisma.alerta.findFirst({
        where: {
          tipo: "PAGAMENTO_FUNCIONARIO",
          entidadeId: func.id,
          lido: false,
          createdAt: { gte: addDays(hoje, -1) },
        },
      });
      if (!jaExiste) {
        const msg = diasRestantes < 0
          ? `Pagamento de "${func.nome}" está em atraso (${Math.abs(diasRestantes)} dia(s))`
          : `Pagamento de "${func.nome}" vence em ${diasRestantes} dia(s)`;
        await prisma.alerta.create({
          data: {
            tipo: "PAGAMENTO_FUNCIONARIO",
            mensagem: msg,
            obraId: func.obraId,
            organizationId: func.organizationId,
            entidadeId: func.id,
            entidadeTipo: "FUNCIONARIO",
          },
        });
      }
    }
  }

  const obrasComPrazo = await prisma.obra.findMany({
    where: {
      ...orgFilter,
      status: { in: ["EM_ANDAMENTO", "PLANEJAMENTO"] },
      dataPrevisaoFim: { gte: hoje, lte: addDays(hoje, 7) },
    },
  });

  for (const obra of obrasComPrazo) {
    const diasRestantes = differenceInDays(obra.dataPrevisaoFim, hoje);
    const jaExiste = await prisma.alerta.findFirst({
      where: {
        tipo: "PRAZO_OBRA",
        obraId: obra.id,
        lido: false,
        createdAt: { gte: addDays(hoje, -1) },
      },
    });
    if (!jaExiste) {
      await prisma.alerta.create({
        data: {
          tipo: "PRAZO_OBRA",
          mensagem: `Obra "${obra.nome}" tem prazo em ${diasRestantes} dia(s)`,
          obraId: obra.id,
          organizationId: obra.organizationId,
          entidadeTipo: "OBRA",
        },
      });
    }
  }

  const despesasPendentes = await prisma.transacaoFinanceira.findMany({
    where: {
      ...orgFilter,
      tipo: "SAIDA",
      status: "PENDENTE",
      data: { lte: addDays(hoje, -7) },
    },
    include: { obra: { select: { id: true } } },
  });

  for (const desp of despesasPendentes) {
    const jaExiste = await prisma.alerta.findFirst({
      where: {
        tipo: "DESPESA_PENDENTE",
        entidadeId: desp.id,
        lido: false,
        createdAt: { gte: addDays(hoje, -1) },
      },
    });
    if (!jaExiste) {
      await prisma.alerta.create({
        data: {
          tipo: "DESPESA_PENDENTE",
          mensagem: `Despesa "${desp.descricao}" está pendente há mais de 7 dias`,
          obraId: desp.obraId,
          organizationId: desp.organizationId,
          entidadeId: desp.id,
          entidadeTipo: "TRANSACAO",
        },
      });
    }
  }

  return { success: true, timestamp: new Date().toISOString() };
}
