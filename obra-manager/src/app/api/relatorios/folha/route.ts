import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  getISOWeek,
  getISOWeekYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// GET: generate payroll report
// Query: obraId, tipo (semanal|mensal|semestral), dataRef (YYYY-MM-DD)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.user.organizationId) return errorResponse("Sem organização", 403);

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obraId");
  const tipo = searchParams.get("tipo") || "mensal";
  const dataRef = searchParams.get("dataRef")
    ? new Date(searchParams.get("dataRef")!)
    : new Date();

  if (!obraId) return errorResponse("obraId obrigatório", 400);

  const orgId = auth.user.organizationId;

  // Determine date range
  let dataInicio: Date;
  let dataFim: Date;
  let periodos: { inicio: Date; fim: Date; label: string }[] = [];

  if (tipo === "semanal") {
    dataInicio = startOfWeek(dataRef, { weekStartsOn: 1 });
    dataFim = endOfWeek(dataRef, { weekStartsOn: 1 });
    periodos = [
      {
        inicio: dataInicio,
        fim: dataFim,
        label: `Semana ${format(dataInicio, "dd/MM")} – ${format(dataFim, "dd/MM/yyyy")}`,
      },
    ];
  } else if (tipo === "mensal") {
    dataInicio = startOfMonth(dataRef);
    dataFim = endOfMonth(dataRef);
    periodos = [
      {
        inicio: dataInicio,
        fim: dataFim,
        label: format(dataRef, "MMMM 'de' yyyy", { locale: ptBR }),
      },
    ];
  } else {
    // semestral
    periodos = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(dataRef, 5 - i);
      return {
        inicio: startOfMonth(d),
        fim: endOfMonth(d),
        label: format(d, "MMM/yy", { locale: ptBR }),
      };
    });
    dataInicio = periodos[0].inicio;
    dataFim = periodos[5].fim;
  }

  // Get obra info
  const obra = await prisma.obra.findFirst({
    where: { id: obraId, organizationId: orgId },
    select: { id: true, nome: true },
  });
  if (!obra) return errorResponse("Obra não encontrada", 404);

  // Get all funcionarios in obra
  const funcionarios = await prisma.funcionario.findMany({
    where: { obraId, organizationId: orgId },
    orderBy: { nome: "asc" },
  });

  // Get all frequency records in range
  const registros = await prisma.registroFrequencia.findMany({
    where: {
      obraId,
      organizationId: orgId,
      data: { gte: dataInicio, lte: dataFim },
    },
    orderBy: { data: "asc" },
  });

  // Build per-funcionario stats
  const linhas = funcionarios.map((f) => {
    const regs = registros.filter((r) => r.funcionarioId === f.id);
    const totalDias = regs.reduce((sum, r) => sum + r.periodo, 0);
    const totalHorasExtras = regs.reduce((sum, r) => sum + r.horasExtras, 0);
    const valorBase = Number(f.valorPagamento);

    // Conta semanas ISO com pelo menos 1 dia de presença (fix: era Math.ceil(dias/6))
    const semanasComPresenca = (registros: typeof regs) =>
      new Set(registros.map((r) => `${getISOWeekYear(r.data)}-${getISOWeek(r.data)}`)).size;

    let valorCalculado = 0;
    if (f.periodicidade === "DIARIO") {
      valorCalculado = totalDias * valorBase;
    } else if (f.periodicidade === "SEMANAL") {
      valorCalculado = semanasComPresenca(regs) * valorBase;
    } else if (f.periodicidade === "QUINZENAL") {
      const quinzenas = Math.ceil(totalDias / 15);
      valorCalculado = quinzenas * valorBase;
    } else {
      // MENSAL
      valorCalculado = valorBase; // fixed — days are for reference
    }

    // Per-period breakdown for semestral
    const porPeriodo = periodos.map((p) => {
      const regsP = regs.filter((r) => r.data >= p.inicio && r.data <= p.fim);
      const dias = regsP.reduce((s, r) => s + r.periodo, 0);
      let valor = 0;
      if (f.periodicidade === "DIARIO") valor = dias * valorBase;
      else if (f.periodicidade === "SEMANAL") valor = semanasComPresenca(regsP) * valorBase;
      else if (f.periodicidade === "MENSAL") valor = dias > 0 ? valorBase : 0;
      else valor = dias * valorBase;
      return { label: p.label, dias, valor };
    });

    return {
      funcionario: {
        id: f.id,
        nome: f.nome,
        cargo: f.cargo,
        tipo: f.tipo,
        periodicidade: f.periodicidade,
        valorPagamento: valorBase,
        dadosBancarios: f.dadosBancarios,
        status: f.status,
      },
      totalDias,
      totalHorasExtras,
      valorCalculado,
      porPeriodo,
      registros: regs.map((r) => ({
        data: format(r.data, "yyyy-MM-dd"),
        periodo: r.periodo,
        horasExtras: r.horasExtras,
        observacao: r.observacao,
      })),
    };
  });

  const totalGeral = linhas.reduce((s, l) => s + l.valorCalculado, 0);
  const totalDiasGeral = linhas.reduce((s, l) => s + l.totalDias, 0);

  return successResponse({
    obra,
    tipo,
    periodos,
    dataInicio: format(dataInicio, "yyyy-MM-dd"),
    dataFim: format(dataFim, "yyyy-MM-dd"),
    linhas,
    totalGeral,
    totalDiasGeral,
    geradoEm: new Date().toISOString(),
  });
}
