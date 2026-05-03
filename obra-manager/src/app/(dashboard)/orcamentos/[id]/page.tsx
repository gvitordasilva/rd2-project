"use client";
import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Printer,
  LayoutGrid,
  FileText,
  BarChart3,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { TooltipIcon } from "@/components/ui/tooltip";

// ─── Types ────────────────────────────────────────────────────────────────────
type OrcRowCat = {
  type: "cat";
  id: string;
  idx: string;
  nome: string;
};

type OrcRowItem = {
  type: "item";
  id: string;
  idx: string;
  nome: string;
  qtd: number | null;
  unid: string;
  precoUnit: number | null;
  baseTotal: number | null;
  total: number | null;
  pendente: boolean;
  obs: string;
};

type OrcRow = OrcRowCat | OrcRowItem;

interface OrcData {
  id: string;
  titulo: string;
  empresa?: string;
  cnpj?: string;
  responsavel?: string;
  contato?: string;
  cliente?: string;
  cnpjCliente?: string;
  nomeObra?: string;
  area: number;
  endereco?: string;
  dataOrcamento?: string;
  validade: number;
  margem: number;
  desconto: number;
  obs?: string;
  status: string;
  rows: OrcRow[];
}

const BASE_AREA = 991;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number | null | undefined) {
  if (v == null || isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtN(v: number | null | undefined) {
  if (v == null) return "";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function getCatTotal(rows: OrcRow[], catIdx: string): number | null {
  let sum = 0;
  let any = false;
  for (const r of rows) {
    if (
      r.type === "item" &&
      r.idx.startsWith(catIdx + ".") &&
      !r.pendente &&
      r.total != null
    ) {
      sum += r.total;
      any = true;
    }
  }
  return any ? sum : null;
}

function hasCatPending(rows: OrcRow[], catIdx: string) {
  return rows.some(
    (r) =>
      r.type === "item" &&
      r.idx.startsWith(catIdx + ".") &&
      (r.pendente || r.total == null)
  );
}

function calcTotals(rows: OrcRow[], margem: number, desconto: number) {
  let confirmed = 0;
  let pendentes = 0;
  for (const r of rows) {
    if (r.type === "item") {
      if (!r.pendente && r.total != null) confirmed += r.total;
      else pendentes++;
    }
  }
  const comMargem = confirmed * (1 + margem / 100);
  const final = comMargem * (1 - desconto / 100);
  return {
    confirmed,
    pendentes,
    margemVal: confirmed * (margem / 100),
    descVal: comMargem * (desconto / 100),
    final,
  };
}

const TABS = [
  { id: "dados", label: "Dados da Obra", icon: ClipboardList },
  { id: "planilha", label: "Planilha", icon: LayoutGrid },
  { id: "resumo", label: "Resumo", icon: BarChart3 },
  { id: "proposta", label: "Proposta", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Main component ───────────────────────────────────────────────────────────
export default function OrcamentoEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { apiFetch } = useApi();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>("planilha");
  const [orc, setOrc] = useState<OrcData | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load ──
  useEffect(() => {
    apiFetch<{ data: OrcData }>(`/api/orcamentos/${id}`)
      .then((res) => {
        const d = res.data;
        setOrc({ ...d, rows: (d.rows as OrcRow[]) || [] });
      })
      .catch(() => toast({ title: "Erro ao carregar", variant: "error" }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Auto-save ──
  const save = useCallback(
    async (data: OrcData) => {
      setSaving(true);
      try {
        await apiFetch(`/api/orcamentos/${id}`, { method: "PUT", body: data });
      } catch {
        toast({ title: "Erro ao salvar", variant: "error" });
      } finally {
        setSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id]
  );

  const scheduleSave = useCallback(
    (data: OrcData) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(data), 1500);
    },
    [save]
  );

  const update = useCallback(
    (patch: Partial<OrcData>) => {
      setOrc((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const updateRows = useCallback(
    (rows: OrcRow[]) => {
      update({ rows });
    },
    [update]
  );

  // ── Row operations ──
  const addCategoria = () => {
    if (!orc) return;
    const cats = orc.rows.filter((r) => r.type === "cat");
    const lastNum =
      cats.length > 0
        ? Math.max(...cats.map((c) => parseInt(c.idx) || 0))
        : 0;
    const newRows: OrcRow[] = [
      ...orc.rows,
      {
        type: "cat",
        id: uid(),
        idx: String(lastNum + 1),
        nome: "Nova Categoria",
      },
    ];
    updateRows(newRows);
  };

  const addItem = () => {
    if (!orc) return;
    const cats = orc.rows.filter((r) => r.type === "cat");
    const lastCat = cats[cats.length - 1];
    const catIdx = lastCat ? lastCat.idx : "1";
    const siblings = orc.rows.filter(
      (r) => r.type === "item" && r.idx.startsWith(catIdx + ".")
    );
    const subNums = siblings.map((r) => parseFloat(r.idx.split(".")[1]) || 0);
    const nextSub = subNums.length ? Math.max(...subNums) + 1 : 1;
    const newRows: OrcRow[] = [
      ...orc.rows,
      {
        type: "item",
        id: uid(),
        idx: `${catIdx}.${nextSub}`,
        nome: "Novo item",
        qtd: 1,
        unid: "VB",
        precoUnit: null,
        baseTotal: null,
        total: null,
        pendente: true,
        obs: "",
      },
    ];
    updateRows(newRows);
  };

  const removeRow = (rowId: string) => {
    if (!orc) return;
    updateRows(orc.rows.filter((r) => r.id !== rowId));
  };

  const updateRow = (rowId: string, patch: Partial<OrcRow>) => {
    if (!orc) return;
    const rows = orc.rows.map((r) =>
      r.id === rowId ? ({ ...r, ...patch } as OrcRow) : r
    );
    updateRows(rows);
  };

  const autoCalcItem = (
    rowId: string,
    qtd: number | null,
    precoUnit: number | null
  ) => {
    if (!orc) return;
    const area = orc.area || BASE_AREA;
    const fator = area / BASE_AREA;
    if (qtd && precoUnit) {
      const total = +(qtd * precoUnit).toFixed(2);
      const baseTotal = +(total / fator).toFixed(2);
      updateRow(rowId, { qtd, precoUnit, total, baseTotal, pendente: false });
    } else {
      updateRow(rowId, { qtd, precoUnit });
    }
  };

  const handleTotalInput = (rowId: string, val: string) => {
    if (!orc) return;
    const v = val.trim();
    if (v === "?" || v === "" || v === "-") {
      updateRow(rowId, { total: null, baseTotal: null, pendente: true });
    } else {
      const num = parseFloat(
        v.replace(/[^\d.,]/g, "").replace(",", ".")
      );
      if (!isNaN(num)) {
        const area = orc.area || BASE_AREA;
        const fator = area / BASE_AREA;
        updateRow(rowId, {
          total: num,
          baseTotal: +(num / fator).toFixed(2),
          pendente: false,
        });
      }
    }
  };

  const recalcAll = (newArea: number) => {
    if (!orc) return;
    const fator = newArea / BASE_AREA;
    const rows = orc.rows.map((r) => {
      if (r.type === "item" && !r.pendente && r.baseTotal != null) {
        return { ...r, total: +(r.baseTotal * fator).toFixed(2) };
      }
      return r;
    });
    update({ area: newArea, rows });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  if (!orc)
    return (
      <div className="text-center py-20 text-[var(--muted-foreground)]">
        Orçamento não encontrado
      </div>
    );

  const totals = calcTotals(orc.rows, orc.margem, orc.desconto);

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => router.push("/orcamentos")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <input
            value={orc.titulo}
            onChange={(e) => update({ titulo: e.target.value })}
            className="font-semibold text-[var(--foreground)] bg-transparent border-none outline-none text-base focus:border-b focus:border-[var(--primary)] w-48 lg:w-72"
          />
          {saving && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--muted-foreground)]" />
          )}
          {!saving && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={orc.status}
            onValueChange={(v) => update({ status: v })}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RASCUNHO">Rascunho</SelectItem>
              <SelectItem value="ENVIADO">Enviado</SelectItem>
              <SelectItem value="APROVADO">Aprovado</SelectItem>
              <SelectItem value="REJEITADO">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[var(--border)] bg-[var(--card)] shrink-0 px-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-amber-500 text-amber-500"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* ── DADOS DA OBRA ── */}
        {tab === "dados" && (
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-amber-500 mb-4">
                Identificação da Obra
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(
                  [
                    ["empresa", "Empresa / Construtora"],
                    ["cnpj", "CNPJ da Empresa"],
                    ["responsavel", "Responsável Técnico"],
                    ["contato", "Telefone / Email"],
                    ["cliente", "Cliente"],
                    ["cnpjCliente", "CNPJ do Cliente"],
                    ["nomeObra", "Nome da Obra"],
                    ["endereco", "Endereço"],
                  ] as [keyof OrcData, string][]
                ).map(([field, label]) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      value={(orc[field] as string) || ""}
                      onChange={(e) => update({ [field]: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label className="text-xs">Área Total (m²)</Label>
                  <Input
                    type="number"
                    value={orc.area || ""}
                    onChange={(e) => recalcAll(+e.target.value || 0)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data da Proposta</Label>
                  <Input
                    type="date"
                    value={orc.dataOrcamento || ""}
                    onChange={(e) => update({ dataOrcamento: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Validade (dias)</Label>
                  <Input
                    type="number"
                    value={orc.validade}
                    onChange={(e) => update({ validade: +e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-amber-500 mb-4">
                Configurações Financeiras
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">Margem / BDI (%)</Label>
                    <TooltipIcon text="BDI (Benefícios e Despesas Indiretas): percentual adicionado ao custo direto para cobrir impostos, administração e lucro. Valores típicos: 15–30%." />
                  </div>
                  <Input
                    type="number"
                    value={orc.margem}
                    onChange={(e) => update({ margem: +e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Desconto Global (%)</Label>
                  <Input
                    type="number"
                    value={orc.desconto}
                    onChange={(e) => update({ desconto: +e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Observações da Proposta</Label>
                  <textarea
                    value={orc.obs || ""}
                    onChange={(e) => update({ obs: e.target.value })}
                    rows={3}
                    placeholder="Condições de pagamento, prazos, exclusões..."
                    className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PLANILHA ── */}
        {tab === "planilha" && (
          <div className="p-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5">
                <span className="text-xs text-[var(--muted-foreground)]">
                  Área Total (m²)
                </span>
                <input
                  type="number"
                  value={orc.area || ""}
                  onChange={(e) => recalcAll(+e.target.value || 0)}
                  className="w-20 bg-transparent border-none outline-none text-amber-500 font-bold text-sm text-right"
                />
              </div>
              <Button size="sm" variant="outline" onClick={addCategoria}>
                <Plus className="w-3.5 h-3.5" /> Categoria
              </Button>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="w-3.5 h-3.5" /> Item
              </Button>
              <div className="ml-auto text-sm font-semibold text-amber-500">
                Total: {fmt(totals.final)}
                {totals.pendentes > 0 && (
                  <span className="text-red-400 text-xs font-normal ml-2">
                    + {totals.pendentes} pendente(s)
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-[var(--muted-foreground)] mb-3 bg-[var(--secondary)] rounded-lg px-3 py-2 border border-[var(--border)]">
              Todos os totais escalam com a Área Total. Use{" "}
              <strong>?</strong> no campo Total para marcar itens pendentes.
            </div>

            {/* Table */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[var(--secondary)] text-[var(--muted-foreground)] text-xs">
                      <th className="text-left px-3 py-2.5 font-semibold w-16">
                        Índice
                      </th>
                      <th className="text-left px-3 py-2.5 font-semibold">
                        Item / Descrição
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold w-20">
                        Qtd.
                      </th>
                      <th className="text-center px-3 py-2.5 font-semibold w-16">
                        Unid.
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">
                        Preço Unit.
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold w-32">
                        Total (R$)
                      </th>
                      <th className="text-left px-3 py-2.5 font-semibold w-40">
                        Observação
                      </th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orc.rows.map((row) => {
                      if (row.type === "cat") {
                        const catTotal = getCatTotal(orc.rows, row.idx);
                        const pend = hasCatPending(orc.rows, row.idx);
                        return (
                          <tr
                            key={row.id}
                            className="bg-gradient-to-r from-amber-500/10 to-transparent border-b border-[var(--border)]"
                          >
                            <td className="px-3 py-2">
                              <span className="inline-block bg-[var(--secondary)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[11px] text-[var(--muted-foreground)] font-bold">
                                {row.idx}
                              </span>
                            </td>
                            <td className="px-2 py-2" colSpan={4}>
                              <input
                                value={row.nome}
                                onChange={(e) =>
                                  updateRow(row.id, { nome: e.target.value })
                                }
                                className="w-full bg-transparent border-none outline-none font-bold text-amber-500 text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-amber-500 text-sm">
                              {pend && (
                                <span className="text-[10px] text-red-400 mr-1">
                                  Pendente
                                </span>
                              )}
                              {catTotal != null ? fmt(catTotal) : "—"}
                            </td>
                            <td></td>
                            <td className="px-2">
                              <button
                                onClick={() => removeRow(row.id)}
                                className="text-red-400 hover:text-red-600 text-base px-1"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      // item row
                      const pend = row.pendente || row.total == null;
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-[var(--border)]/40 hover:bg-[var(--secondary)]/30 ${pend ? "text-red-400" : ""}`}
                        >
                          <td className="px-3 py-1.5">
                            <span className="text-[11px] text-[var(--muted-foreground)]">
                              {row.idx}
                            </span>
                          </td>
                          <td className="px-2 py-1">
                            <input
                              value={row.nome}
                              onChange={(e) =>
                                updateRow(row.id, { nome: e.target.value })
                              }
                              className="w-full bg-transparent border-none outline-none text-sm text-[var(--foreground)] min-w-[160px]"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={row.qtd ?? ""}
                              onChange={(e) =>
                                autoCalcItem(
                                  row.id,
                                  +e.target.value || null,
                                  row.precoUnit
                                )
                              }
                              className="w-full bg-transparent border-none outline-none text-sm text-right text-[var(--foreground)]"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              value={row.unid}
                              onChange={(e) =>
                                updateRow(row.id, { unid: e.target.value })
                              }
                              className="w-full bg-transparent border-none outline-none text-sm text-center text-[var(--foreground)]"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={row.precoUnit ?? ""}
                              onChange={(e) =>
                                autoCalcItem(
                                  row.id,
                                  row.qtd,
                                  +e.target.value || null
                                )
                              }
                              className="w-full bg-transparent border-none outline-none text-sm text-right text-amber-400"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              value={pend ? "?" : fmtN(row.total)}
                              onChange={(e) =>
                                handleTotalInput(row.id, e.target.value)
                              }
                              className={`w-full bg-transparent border-none outline-none text-sm text-right font-semibold ${pend ? "text-red-400" : "text-emerald-500"}`}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              value={row.obs}
                              onChange={(e) =>
                                updateRow(row.id, { obs: e.target.value })
                              }
                              placeholder="Observação..."
                              className="w-full bg-transparent border-none outline-none text-xs text-[var(--muted-foreground)]"
                            />
                          </td>
                          <td className="px-2">
                            <button
                              onClick={() => removeRow(row.id)}
                              className="text-red-400 hover:text-red-600 text-base px-1"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total row */}
                    <tr className="bg-amber-500/10 border-t-2 border-amber-500/30">
                      <td
                        colSpan={5}
                        className="px-3 py-3 font-bold text-amber-500"
                      >
                        TOTAL GERAL
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-amber-500 text-base">
                        {fmt(totals.final)}
                      </td>
                      <td
                        colSpan={2}
                        className="px-3 py-3 text-xs text-[var(--muted-foreground)]"
                      >
                        {totals.pendentes > 0
                          ? `+ ${totals.pendentes} item(ns) pendente(s)`
                          : "Orçamento completo"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── RESUMO ── */}
        {tab === "resumo" && (
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">
                  Área da Obra
                </p>
                <p className="text-xl font-bold text-[var(--foreground)]">
                  {(orc.area || 0).toLocaleString("pt-BR")} m²
                </p>
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">
                  Subtotal Confirmado
                </p>
                <p className="text-xl font-bold text-[var(--foreground)]">
                  {fmt(totals.confirmed)}
                </p>
              </div>
              <div className="bg-[var(--card)] border border-amber-500/40 rounded-xl p-4">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">
                  Total Final
                </p>
                <p className="text-xl font-bold text-amber-500">
                  {fmt(totals.final)}
                </p>
                {orc.area > 0 && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    {fmt(totals.final / orc.area)}/m²
                  </p>
                )}
              </div>
              <div className="bg-[var(--card)] border border-red-500/30 rounded-xl p-4">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">
                  Itens Pendentes
                </p>
                <p className="text-xl font-bold text-red-400">
                  {totals.pendentes}
                </p>
              </div>
            </div>

            {/* Category table */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h3 className="font-semibold text-sm text-[var(--foreground)]">
                  Resumo por Categoria
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--secondary)] text-[var(--muted-foreground)] text-xs">
                    <th className="text-left px-4 py-2.5 font-semibold w-16">
                      Índice
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold">
                      Categoria
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold">
                      Total
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold">
                      % do Total
                    </th>
                    <th className="text-center px-4 py-2.5 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orc.rows
                    .filter((r) => r.type === "cat")
                    .map((cat) => {
                      const catTotal = getCatTotal(orc.rows, cat.idx);
                      const pend = hasCatPending(orc.rows, cat.idx);
                      return (
                        <tr
                          key={cat.id}
                          className="border-b border-[var(--border)]/40 hover:bg-[var(--secondary)]/30"
                        >
                          <td className="px-4 py-2.5">
                            <span className="inline-block bg-[var(--secondary)] border border-[var(--border)] rounded px-2 py-0.5 text-xs text-[var(--muted-foreground)] font-bold">
                              {cat.idx}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[var(--foreground)]">
                            {cat.nome}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-amber-500">
                            {catTotal != null ? fmt(catTotal) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[var(--muted-foreground)]">
                            {catTotal != null && totals.confirmed > 0
                              ? (
                                  (catTotal / totals.confirmed) *
                                  100
                                ).toFixed(1) + "%"
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {pend ? (
                              <span className="inline-block bg-red-100 text-red-600 text-[10px] rounded px-2 py-0.5 font-semibold">
                                Pendente
                              </span>
                            ) : (
                              <span className="text-emerald-500 text-xs">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  <tr className="bg-amber-500/10 border-t-2 border-amber-500/30">
                    <td
                      colSpan={2}
                      className="px-4 py-3 font-bold text-amber-500"
                    >
                      TOTAL GERAL
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-500 text-base">
                      {fmt(totals.final)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--muted-foreground)] text-xs">
                      100%
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setTab("proposta")}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                <FileText className="w-4 h-4" /> Gerar Proposta Formal
              </Button>
            </div>
          </div>
        )}

        {/* ── PROPOSTA ── */}
        {tab === "proposta" && (
          <div className="p-6">
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              <Button
                onClick={() => window.print()}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
              </Button>
            </div>

            {/* Printable proposal */}
            <div
              id="proposalOutput"
              className="bg-white text-gray-900 rounded-xl p-10 font-sans text-[13px] leading-relaxed shadow-sm max-w-5xl mx-auto print:shadow-none print:rounded-none print:p-0"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-amber-600">
                <div>
                  <div className="text-2xl font-bold text-amber-700">
                    {orc.empresa || "Construtora"}
                  </div>
                  {orc.cnpj && (
                    <div className="text-xs text-gray-500 mt-1">
                      CNPJ: {orc.cnpj}
                    </div>
                  )}
                  {orc.responsavel && (
                    <div className="text-xs text-gray-500">
                      Responsável: {orc.responsavel}
                    </div>
                  )}
                  {orc.contato && (
                    <div className="text-xs text-gray-500">{orc.contato}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-amber-700">
                    PROPOSTA COMERCIAL
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Data:{" "}
                    {orc.dataOrcamento
                      ? new Date(
                          orc.dataOrcamento + "T12:00:00"
                        ).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : new Date().toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                  </div>
                  <div className="text-xs text-gray-500">
                    Validade: {orc.validade} dias corridos
                  </div>
                </div>
              </div>

              {/* Client info */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm leading-7">
                <strong>Cliente:</strong> {orc.cliente || "—"}
                {orc.cnpjCliente ? ` — CNPJ: ${orc.cnpjCliente}` : ""}
                <br />
                <strong>Obra:</strong> {orc.nomeObra || "—"} |{" "}
                <strong>Área:</strong>{" "}
                {(orc.area || 0).toLocaleString("pt-BR")} m²
                {orc.endereco && (
                  <>
                    <br />
                    <strong>Endereço:</strong> {orc.endereco}
                  </>
                )}
              </div>

              <p className="mb-6 text-gray-700">
                Prezado(a) <strong>{orc.cliente || "Cliente"}</strong>,
                apresentamos a proposta comercial para execução dos serviços
                referentes à obra{" "}
                <strong>{orc.nomeObra || "—"}</strong>, área total de{" "}
                <strong>{(orc.area || 0).toLocaleString("pt-BR")} m²</strong>.
              </p>

              {/* Items table */}
              <h2 className="text-amber-800 border-b-2 border-amber-600 pb-1.5 mt-6 mb-3 text-sm font-bold">
                1. Composição Detalhada do Orçamento
              </h2>
              <table className="w-full border-collapse text-xs mb-6">
                <thead>
                  <tr className="bg-amber-50">
                    <th className="border border-amber-200 px-2 py-1.5 text-left text-amber-800">
                      Índice
                    </th>
                    <th className="border border-amber-200 px-2 py-1.5 text-left text-amber-800">
                      Descrição
                    </th>
                    <th className="border border-amber-200 px-2 py-1.5 text-center text-amber-800">
                      Qtd.
                    </th>
                    <th className="border border-amber-200 px-2 py-1.5 text-center text-amber-800">
                      Unid.
                    </th>
                    <th className="border border-amber-200 px-2 py-1.5 text-right text-amber-800">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orc.rows.map((row) => {
                    if (row.type === "cat") {
                      const catTotal = getCatTotal(orc.rows, row.idx);
                      const pend = hasCatPending(orc.rows, row.idx);
                      return (
                        <tr key={row.id} className="bg-amber-50">
                          <td
                            colSpan={5}
                            className="border border-amber-200 px-2 py-2 font-bold text-amber-800"
                          >
                            {row.idx} — {row.nome}
                            <span className="float-right font-bold">
                              {pend && (
                                <span className="text-red-600 text-[10px] mr-2">
                                  + Pendentes
                                </span>
                              )}
                              {catTotal != null ? fmt(catTotal) : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    const isPend = row.pendente || row.total == null;
                    return (
                      <tr key={row.id} className="border-b border-gray-100">
                        <td className="border border-gray-200 px-2 py-1.5 text-gray-500">
                          {row.idx}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5">
                          {row.nome}
                          {row.obs && (
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {row.obs}
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-center">
                          {row.qtd != null ? fmtN(row.qtd) : "—"}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-center">
                          {row.unid || "VB"}
                        </td>
                        <td
                          className={`border border-gray-200 px-2 py-1.5 text-right font-semibold ${isPend ? "text-red-600 italic" : ""}`}
                        >
                          {isPend ? "A definir" : fmt(row.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Financial summary */}
              <h2 className="text-amber-800 border-b-2 border-amber-600 pb-1.5 mt-6 mb-3 text-sm font-bold">
                2. Resumo Financeiro
              </h2>
              <table className="w-full border-collapse text-xs mb-6">
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">
                      Subtotal confirmado
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-right">
                      {fmt(totals.confirmed)}
                    </td>
                  </tr>
                  {totals.pendentes > 0 && (
                    <tr>
                      <td className="border border-gray-200 px-3 py-2 text-red-600">
                        Itens pendentes ({totals.pendentes} — a definir)
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-right text-red-600">
                        A confirmar
                      </td>
                    </tr>
                  )}
                  {orc.margem > 0 && (
                    <tr>
                      <td className="border border-gray-200 px-3 py-2">
                        BDI / Margem ({orc.margem}%)
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-right">
                        {fmt(totals.margemVal)}
                      </td>
                    </tr>
                  )}
                  {orc.desconto > 0 && (
                    <tr>
                      <td className="border border-gray-200 px-3 py-2">
                        Desconto ({orc.desconto}%)
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-right text-red-600">
                        — {fmt(totals.descVal)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-amber-50">
                    <td className="border border-amber-200 px-3 py-2.5 font-bold text-amber-800">
                      VALOR TOTAL DA PROPOSTA
                    </td>
                    <td className="border border-amber-200 px-3 py-2.5 text-right font-bold text-amber-800 text-sm">
                      {fmt(totals.final)}
                    </td>
                  </tr>
                  {orc.area > 0 && (
                    <tr>
                      <td className="border border-gray-200 px-3 py-2 text-gray-500">
                        Custo por m²
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-right text-gray-500">
                        {fmt(totals.final / orc.area)}/m²
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Conditions */}
              <h2 className="text-amber-800 border-b-2 border-amber-600 pb-1.5 mt-6 mb-3 text-sm font-bold">
                3. Condições Comerciais
              </h2>
              <div className="text-gray-700 leading-8 text-xs">
                <p>
                  Esta proposta tem validade de{" "}
                  <strong>{orc.validade} dias corridos</strong> a partir da data
                  de emissão.
                </p>
                <p>
                  Os valores poderão ser reajustados em caso de variação
                  superior a 5% nos índices INCC.
                </p>
                <p>
                  O cronograma de execução será definido em contrato, após
                  aprovação desta proposta.
                </p>
                {totals.pendentes > 0 && (
                  <p>
                    Itens marcados como &quot;A definir&quot; serão orçados e
                    apresentados em aditivo contratual.
                  </p>
                )}
                {orc.obs && <p>{orc.obs}</p>}
              </div>

              {/* Signatures */}
              <h2 className="text-amber-800 border-b-2 border-amber-600 pb-1.5 mt-6 mb-6 text-sm font-bold">
                4. Aceite e Aprovação
              </h2>
              <div className="grid grid-cols-2 gap-12 mt-8">
                <div className="text-center">
                  <div className="h-12"></div>
                  <div className="border-t border-gray-700 pt-2 text-xs text-gray-700">
                    {orc.empresa || "Construtora"}
                    <br />
                    <span className="text-gray-500">
                      {orc.responsavel || "Responsável Técnico"}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="h-12"></div>
                  <div className="border-t border-gray-700 pt-2 text-xs text-gray-700">
                    {orc.cliente || "Cliente"}
                    <br />
                    <span className="text-gray-500">Contratante</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
                Documento gerado por Obra Manager •{" "}
                {new Date().toLocaleDateString("pt-BR")} •{" "}
                {orc.empresa || ""}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          [data-sidebar],
          nav,
          header,
          .no-print {
            display: none !important;
          }
          #proposalOutput {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
