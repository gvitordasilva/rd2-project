"use client";
import { useEffect, useState, useCallback } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isWeekend,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Loader2,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Obra {
  id: string;
  nome: string;
}

interface FreqRecord {
  funcionarioId: string;
  data: string;
  periodo: number;
  horasExtras: number;
  funcionario: FuncionarioInfo;
}

interface FuncionarioInfo {
  id: string;
  nome: string;
  cargo: string;
  tipo: string;
  valorPagamento: number;
  periodicidade: string;
  status: string;
}

interface RelatorioLinha {
  funcionario: FuncionarioInfo & { dadosBancarios: string | null };
  totalDias: number;
  totalHorasExtras: number;
  valorCalculado: number;
  porPeriodo: { label: string; dias: number; valor: number }[];
  registros: {
    data: string;
    periodo: number;
    horasExtras: number;
    observacao: string | null;
  }[];
}

interface Relatorio {
  obra: { id: string; nome: string };
  tipo: string;
  periodos: { label: string }[];
  dataInicio: string;
  dataFim: string;
  linhas: RelatorioLinha[];
  totalGeral: number;
  totalDiasGeral: number;
}

interface ObraDetalhe {
  id: string;
  nome: string;
  funcionarios: (FuncionarioInfo & { dadosBancarios?: string })[];
}

const TIPO_COLORS: Record<string, string> = {
  CLT: "bg-blue-100 text-blue-700",
  PJ: "bg-purple-100 text-purple-700",
  DIARIA: "bg-amber-100 text-amber-700",
  EMPREITEIRO: "bg-orange-100 text-orange-700",
};

const PERIODO_SUFFIX: Record<string, string> = {
  DIARIO: "/dia",
  SEMANAL: "/sem",
  QUINZENAL: "/quin",
  MENSAL: "/mês",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [tab, setTab] = useState<"frequencia" | "folha" | "semestral">(
    "frequencia"
  );
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState<string>("");

  // Frequência state
  const [semanaRef, setSemanaRef] = useState(new Date());
  const [funcionarios, setFuncionarios] = useState<FuncionarioInfo[]>([]);
  const [freqMap, setFreqMap] = useState<Map<string, number>>(new Map());
  const [saving, setSaving] = useState(false);
  const [loadingFreq, setLoadingFreq] = useState(false);

  // Relatório state
  const [mesRef, setMesRef] = useState(new Date());
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [loadingRel, setLoadingRel] = useState(false);

  // Load obras
  useEffect(() => {
    apiFetch<{ data: { data: Obra[] } }>("/api/obras", {
      params: { pageSize: 100 },
    })
      .then((res) => setObras(res.data.data))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Days of the current week (Mon–Sun)
  const weekDays = eachDayOfInterval({
    start: startOfWeek(semanaRef, { weekStartsOn: 1 }),
    end: endOfWeek(semanaRef, { weekStartsOn: 1 }),
  });

  // Load frequency records when obra or week changes
  const loadFreq = useCallback(async () => {
    if (!obraId) return;
    setLoadingFreq(true);
    const inicio = format(
      startOfWeek(semanaRef, { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    );
    const fim = format(
      endOfWeek(semanaRef, { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    );
    try {
      const [obraRes, freqRes] = await Promise.all([
        apiFetch<{ data: ObraDetalhe }>(`/api/obras/${obraId}`),
        apiFetch<{ data: FreqRecord[] }>(
          `/api/frequencias?obraId=${obraId}&dataInicio=${inicio}&dataFim=${fim}`
        ),
      ]);
      const funcs = obraRes.data.funcionarios ?? [];
      setFuncionarios(
        funcs.filter((f: FuncionarioInfo) => f.status === "ATIVO")
      );
      const map = new Map<string, number>();
      for (const r of freqRes.data) {
        map.set(`${r.funcionarioId}|${r.data.slice(0, 10)}`, r.periodo);
      }
      setFreqMap(map);
    } catch {
      toast({ title: "Erro ao carregar frequência", variant: "error" });
    } finally {
      setLoadingFreq(false);
    }
  }, [obraId, semanaRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadFreq();
  }, [loadFreq]);

  const saveFreq = async () => {
    if (!obraId) return;
    setSaving(true);
    try {
      const registros: {
        funcionarioId: string;
        obraId: string;
        data: string;
        periodo: number;
      }[] = [];
      for (const func of funcionarios) {
        for (const day of weekDays) {
          const dateStr = format(day, "yyyy-MM-dd");
          const key = `${func.id}|${dateStr}`;
          const periodo = freqMap.get(key) ?? 0;
          registros.push({
            funcionarioId: func.id,
            obraId,
            data: dateStr,
            periodo,
          });
        }
      }
      await apiFetch("/api/frequencias", {
        method: "POST",
        body: { registros },
      });
      toast({ title: "Frequência salva!", variant: "success" });
    } catch {
      toast({ title: "Erro ao salvar frequência", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const loadRelatorio = async (tipo: "mensal" | "semestral") => {
    if (!obraId) {
      toast({ title: "Selecione uma obra", variant: "error" });
      return;
    }
    setLoadingRel(true);
    setRelatorio(null);
    try {
      const dataRef =
        tipo === "mensal"
          ? format(mesRef, "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd");
      const res = await apiFetch<{ data: Relatorio }>(
        `/api/relatorios/folha?obraId=${obraId}&tipo=${tipo}&dataRef=${dataRef}`
      );
      setRelatorio(res.data);
    } catch {
      toast({ title: "Erro ao gerar relatório", variant: "error" });
    } finally {
      setLoadingRel(false);
    }
  };

  const getPeriodLabel = (periodo: number | undefined) => {
    if (periodo === undefined || periodo === 0) return null;
    if (periodo >= 1) return "✓";
    return "½";
  };

  const getPeriodBg = (periodo: number | undefined) => {
    if (periodo === undefined || periodo === 0)
      return "bg-[var(--secondary)] text-[var(--muted-foreground)]";
    if (periodo >= 1) return "bg-emerald-500 text-white";
    return "bg-amber-400 text-white";
  };

  const TABS = [
    { id: "frequencia" as const, label: "Lançar Frequência", icon: Calendar },
    { id: "folha" as const, label: "Folha Mensal", icon: DollarSign },
    { id: "semestral" as const, label: "Semestral", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-[var(--secondary)] rounded-xl p-1 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Obra selector (shared) */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[var(--muted-foreground)]" />
          <span className="text-sm font-medium text-[var(--muted-foreground)]">
            Obra:
          </span>
        </div>
        <Select value={obraId} onValueChange={setObraId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecionar obra..." />
          </SelectTrigger>
          <SelectContent>
            {obras.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── TAB: LANÇAR FREQUÊNCIA ── */}
      {tab === "frequencia" && (
        <div className="space-y-4">
          {/* Week navigation */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSemanaRef(subWeeks(semanaRef, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-semibold min-w-52 text-center">
                Semana: {format(weekDays[0], "dd/MM")} –{" "}
                {format(weekDays[6], "dd/MM/yyyy")}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSemanaRef(addWeeks(semanaRef, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald-500 inline-flex items-center justify-center text-white text-[10px]">
                  ✓
                </span>
                Dia inteiro
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-amber-400 inline-flex items-center justify-center text-white text-[10px]">
                  ½
                </span>
                Meio período
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-[var(--secondary)] inline-flex items-center justify-center text-[10px]">
                  —
                </span>
                Falta
              </span>
            </div>
            <Button
              onClick={saveFreq}
              disabled={saving || !obraId}
              size="sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Salvar frequência
            </Button>
          </div>

          {!obraId ? (
            <Card>
              <CardContent className="py-12 text-center text-[var(--muted-foreground)]">
                Selecione uma obra para lançar frequência
              </CardContent>
            </Card>
          ) : loadingFreq ? (
            <Card>
              <CardContent className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
              </CardContent>
            </Card>
          ) : funcionarios.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-[var(--muted-foreground)]">
                Nenhum funcionário ativo nesta obra
              </CardContent>
            </Card>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--secondary)] border-b border-[var(--border)]">
                      <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] min-w-[200px]">
                        Funcionário
                      </th>
                      {weekDays.map((d) => (
                        <th
                          key={d.toISOString()}
                          className={`text-center px-2 py-3 font-semibold w-16 ${
                            isWeekend(d)
                              ? "text-[var(--muted-foreground)]"
                              : "text-[var(--foreground)]"
                          }`}
                        >
                          <div className="text-xs font-bold">
                            {format(d, "EEE", { locale: ptBR }).toUpperCase()}
                          </div>
                          <div className="text-[11px] font-normal text-[var(--muted-foreground)]">
                            {format(d, "dd/MM")}
                          </div>
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 font-semibold text-[var(--foreground)] w-20">
                        Dias
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-[var(--foreground)] w-28">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {funcionarios.map((f, fi) => {
                      const totalDias = weekDays.reduce((sum, d) => {
                        const p = freqMap.get(
                          `${f.id}|${format(d, "yyyy-MM-dd")}`
                        );
                        return sum + (p ?? 0);
                      }, 0);
                      const vr = Number(f.valorPagamento);
                      const valor =
                        f.periodicidade === "DIARIO"
                          ? totalDias * vr
                          : f.periodicidade === "SEMANAL"
                          ? totalDias > 0
                            ? vr
                            : 0
                          : f.periodicidade === "QUINZENAL"
                          ? Math.ceil(totalDias / 15) * vr
                          : vr * (totalDias / 30);

                      return (
                        <tr
                          key={f.id}
                          className={`border-b border-[var(--border)]/40 ${
                            fi % 2 === 0 ? "" : "bg-[var(--secondary)]/20"
                          }`}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {f.nome.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-[var(--foreground)] truncate text-xs">
                                  {f.nome}
                                </p>
                                <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                                  {f.cargo}
                                </p>
                              </div>
                              <span
                                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                                  TIPO_COLORS[f.tipo] || ""
                                }`}
                              >
                                {f.tipo}
                              </span>
                            </div>
                          </td>
                          {weekDays.map((d) => {
                            const dateStr = format(d, "yyyy-MM-dd");
                            const key = `${f.id}|${dateStr}`;
                            const periodo = freqMap.get(key);
                            return (
                              <td
                                key={dateStr}
                                className={`px-1 py-2 text-center ${
                                  isWeekend(d) ? "opacity-50" : ""
                                }`}
                              >
                                <button
                                  onClick={() => {
                                    const cur = freqMap.get(key);
                                    const cycles: Record<string, number> = {
                                      undefined: 1,
                                      "1": 0.5,
                                      "0.5": 0,
                                    };
                                    const nextVal =
                                      cycles[String(cur)] ?? 1;
                                    setFreqMap((prev) => {
                                      const m = new Map(prev);
                                      m.set(key, nextVal);
                                      return m;
                                    });
                                  }}
                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all hover:scale-110 active:scale-95 mx-auto flex items-center justify-center ${getPeriodBg(
                                    periodo
                                  )}`}
                                >
                                  {getPeriodLabel(periodo) ?? "—"}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center">
                            <span className="font-bold text-[var(--foreground)]">
                              {totalDias}
                            </span>
                            <span className="text-[10px] text-[var(--muted-foreground)] block">
                              dias
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="font-semibold text-emerald-600 text-xs">
                              {formatCurrency(valor)}
                            </span>
                            <span className="text-[10px] text-[var(--muted-foreground)] block">
                              {PERIODO_SUFFIX[f.periodicidade]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[var(--secondary)] border-t-2 border-[var(--border)]">
                      <td className="px-4 py-3 font-bold text-[var(--foreground)]">
                        TOTAL DA SEMANA
                      </td>
                      <td colSpan={7}></td>
                      <td className="px-3 py-3 text-center font-bold">
                        {funcionarios.reduce(
                          (s, f) =>
                            s +
                            weekDays.reduce(
                              (ds, d) =>
                                ds +
                                (freqMap.get(
                                  `${f.id}|${format(d, "yyyy-MM-dd")}`
                                ) ?? 0),
                              0
                            ),
                          0
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        {formatCurrency(
                          funcionarios.reduce((s, f) => {
                            const totalDias = weekDays.reduce(
                              (ds, d) =>
                                ds +
                                (freqMap.get(
                                  `${f.id}|${format(d, "yyyy-MM-dd")}`
                                ) ?? 0),
                              0
                            );
                            const vr = Number(f.valorPagamento);
                            return (
                              s +
                              (f.periodicidade === "DIARIO"
                                ? totalDias * vr
                                : f.periodicidade === "SEMANAL" && totalDias > 0
                                ? vr
                                : f.periodicidade === "QUINZENAL"
                                ? Math.ceil(totalDias / 15) * vr
                                : vr * (totalDias / 30))
                            );
                          }, 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: FOLHA MENSAL ── */}
      {tab === "folha" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setMesRef(subMonths(mesRef, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold capitalize min-w-40 text-center">
              {format(mesRef, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setMesRef(addMonths(mesRef, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => loadRelatorio("mensal")}
              disabled={loadingRel || !obraId}
              size="sm"
            >
              {loadingRel ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <DollarSign className="w-4 h-4" />
              )}
              Gerar folha
            </Button>
            {relatorio && relatorio.tipo === "mensal" && (
              <>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" /> Imprimir
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadCSV(relatorio)}>
                  <Download className="w-4 h-4" /> Exportar CSV
                </Button>
              </>
            )}
          </div>

          {!relatorio || relatorio.tipo !== "mensal" ? (
            <Card>
              <CardContent className="py-12 text-center text-[var(--muted-foreground)]">
                {loadingRel ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : (
                  "Selecione uma obra e clique em Gerar folha"
                )}
              </CardContent>
            </Card>
          ) : (
            <FolhaPrint relatorio={relatorio} />
          )}
        </div>
      )}

      {/* ── TAB: SEMESTRAL ── */}
      {tab === "semestral" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => loadRelatorio("semestral")}
              disabled={loadingRel || !obraId}
              size="sm"
            >
              {loadingRel ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              Gerar relatório semestral
            </Button>
            {relatorio && relatorio.tipo === "semestral" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4" /> Imprimir
              </Button>
            )}
          </div>

          {!relatorio || relatorio.tipo !== "semestral" ? (
            <Card>
              <CardContent className="py-12 text-center text-[var(--muted-foreground)]">
                {loadingRel ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : (
                  "Selecione uma obra e gere o relatório semestral"
                )}
              </CardContent>
            </Card>
          ) : (
            <SemestralView relatorio={relatorio} />
          )}
        </div>
      )}

      <style jsx global>{`
        @media print {
          body > *:not(#__next) {
            display: none;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          @page {
            margin: 20mm;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Folha Mensal printable ───────────────────────────────────────────────────
function downloadCSV(relatorio: Relatorio) {
  const PERIODO_SUFFIX: Record<string, string> = { DIARIO: "/dia", SEMANAL: "/sem", QUINZENAL: "/quin", MENSAL: "/mês" };
  const header = ["Funcionário", "Cargo", "Tipo", "Periodicidade", "Valor Base", "Dias Trabalhados", "Total a Pagar", "Dados Bancários"];
  const rows = relatorio.linhas.map((l) => [
    l.funcionario.nome,
    l.funcionario.cargo,
    l.funcionario.tipo,
    l.funcionario.periodicidade,
    `R$ ${Number(l.funcionario.valorPagamento).toFixed(2).replace(".", ",")}${PERIODO_SUFFIX[l.funcionario.periodicidade] ?? ""}`,
    String(l.totalDias),
    `R$ ${l.valorCalculado.toFixed(2).replace(".", ",")}`,
    l.funcionario.dadosBancarios || "",
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `folha-${relatorio.obra.nome}-${relatorio.periodos[0]?.label ?? "relatorio"}.csv`.replace(/\s+/g, "-");
  a.click();
  URL.revokeObjectURL(url);
}

function FolhaPrint({ relatorio }: { relatorio: Relatorio }) {
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">
              Funcionários
            </p>
            <p className="text-2xl font-bold">{relatorio.linhas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">
              Total de Dias
            </p>
            <p className="text-2xl font-bold">{relatorio.totalDiasGeral}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 border-l-4 border-emerald-500">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">
              Total a Pagar
            </p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(relatorio.totalGeral)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">
              Média por Funcionário
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                relatorio.linhas.length
                  ? relatorio.totalGeral / relatorio.linhas.length
                  : 0
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Printable table */}
      <div
        id="folha-print"
        className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[var(--foreground)]">
              Folha de Pagamento — {relatorio.obra.nome}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] capitalize">
              {relatorio.periodos[0]?.label}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--secondary)] text-xs text-[var(--muted-foreground)]">
                <th className="text-left px-4 py-3 font-semibold">
                  Funcionário
                </th>
                <th className="text-center px-3 py-3 font-semibold w-16">
                  Tipo
                </th>
                <th className="text-center px-3 py-3 font-semibold w-20">
                  Dias trab.
                </th>
                <th className="text-right px-3 py-3 font-semibold w-28">
                  Valor base
                </th>
                <th className="text-right px-4 py-3 font-semibold w-28">
                  Total
                </th>
                <th className="text-left px-4 py-3 font-semibold">
                  Dados bancários
                </th>
              </tr>
            </thead>
            <tbody>
              {relatorio.linhas.map((linha, i) => (
                <tr
                  key={linha.funcionario.id}
                  className={`border-b border-[var(--border)]/40 ${
                    i % 2 === 0 ? "" : "bg-[var(--secondary)]/20"
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--foreground)]">
                      {linha.funcionario.nome}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {linha.funcionario.cargo}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        TIPO_COLORS[linha.funcionario.tipo] || ""
                      }`}
                    >
                      {linha.funcionario.tipo}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-semibold">
                    {linha.totalDias}
                  </td>
                  <td className="px-3 py-3 text-right text-[var(--muted-foreground)] text-xs">
                    {formatCurrency(Number(linha.funcionario.valorPagamento))}
                    {PERIODO_SUFFIX[linha.funcionario.periodicidade]}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    {formatCurrency(linha.valorCalculado)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                    {linha.funcionario.dadosBancarios || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-500/10 border-t-2 border-emerald-500/30">
                <td
                  colSpan={4}
                  className="px-4 py-3 font-bold text-[var(--foreground)]"
                >
                  TOTAL GERAL
                </td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600 text-base">
                  {formatCurrency(relatorio.totalGeral)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Semestral view ───────────────────────────────────────────────────────────
function SemestralView({ relatorio }: { relatorio: Relatorio }) {
  const periodos = relatorio.periodos;
  const maxVal = Math.max(
    ...periodos.map((_, pi) =>
      relatorio.linhas.reduce(
        (s, l) => s + (l.porPeriodo[pi]?.valor ?? 0),
        0
      )
    ),
    1
  );

  return (
    <div className="space-y-6">
      {/* Bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Custo de Mão de Obra — Últimos 6 Meses ({relatorio.obra.nome})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-40">
            {periodos.map((p, pi) => {
              const total = relatorio.linhas.reduce(
                (s, l) => s + (l.porPeriodo[pi]?.valor ?? 0),
                0
              );
              const height =
                maxVal > 0 ? Math.round((total / maxVal) * 100) : 0;
              return (
                <div
                  key={pi}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] font-semibold text-emerald-600">
                    {formatCurrency(total)}
                  </span>
                  <div
                    className="w-full bg-emerald-500 rounded-t-md transition-all"
                    style={{
                      height: `${Math.max(height, 4)}%`,
                      minHeight: "4px",
                    }}
                  />
                  <span className="text-[10px] text-[var(--muted-foreground)] capitalize">
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-worker breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Detalhamento por Funcionário
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--secondary)] text-[var(--muted-foreground)]">
                  <th className="text-left px-4 py-2.5 font-semibold">
                    Funcionário
                  </th>
                  {periodos.map((p) => (
                    <th
                      key={p.label}
                      className="text-right px-3 py-2.5 font-semibold capitalize"
                    >
                      {p.label}
                    </th>
                  ))}
                  <th className="text-right px-4 py-2.5 font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {relatorio.linhas.map((linha, i) => (
                  <tr
                    key={linha.funcionario.id}
                    className={`border-b border-[var(--border)]/40 ${
                      i % 2 === 0 ? "" : "bg-[var(--secondary)]/20"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-[var(--foreground)]">
                        {linha.funcionario.nome}
                      </p>
                      <p className="text-[var(--muted-foreground)]">
                        {linha.funcionario.cargo}
                      </p>
                    </td>
                    {linha.porPeriodo.map((p, pi) => (
                      <td key={pi} className="px-3 py-2.5 text-right">
                        <span
                          className={
                            p.valor > 0
                              ? "font-medium text-[var(--foreground)]"
                              : "text-[var(--muted-foreground)]"
                          }
                        >
                          {p.valor > 0 ? formatCurrency(p.valor) : "—"}
                        </span>
                        {p.dias > 0 && (
                          <span className="block text-[var(--muted-foreground)]">
                            {p.dias}d
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right font-bold text-[var(--foreground)]">
                      {formatCurrency(
                        linha.porPeriodo.reduce((s, p) => s + p.valor, 0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--secondary)] border-t-2 border-[var(--border)]">
                  <td className="px-4 py-3 font-bold text-[var(--foreground)]">
                    TOTAL
                  </td>
                  {periodos.map((_, pi) => {
                    const total = relatorio.linhas.reduce(
                      (s, l) => s + (l.porPeriodo[pi]?.valor ?? 0),
                      0
                    );
                    return (
                      <td
                        key={pi}
                        className="px-3 py-3 text-right font-bold text-emerald-600"
                      >
                        {formatCurrency(total)}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right font-bold text-emerald-600 text-sm">
                    {formatCurrency(relatorio.totalGeral)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
