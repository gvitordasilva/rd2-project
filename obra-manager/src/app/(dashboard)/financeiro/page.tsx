"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, DollarSign, TrendingUp, TrendingDown, Edit, Trash2, Loader2, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TransacaoFormDialog } from "@/components/forms/transacao-form";

interface Transacao {
  id: string;
  tipo: string;
  valor: number;
  data: string;
  categoria: string;
  descricao: string;
  fornecedor: string | null;
  status: string;
  obra: { nome: string };
  user: { nome: string };
}

interface Resumo {
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
  saldoPendente: number;
  fluxoMensal: { mes: string; entradas: number; saidas: number }[];
  despesasPorCategoria: { categoria: string; total: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  PAGO: "success",
  PENDENTE: "warning",
  CANCELADO: "secondary",
};

const PIE_COLORS = ["#1d4ed8", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"];

export default function FinanceiroPage() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [total, setTotal] = useState(0);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipoFilter, setTipoFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Transacao | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transacao | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [transRes, resumoRes] = await Promise.all([
        apiFetch<{ data: { data: Transacao[]; total: number } }>("/api/financeiro", {
          params: { tipo: tipoFilter || undefined, status: statusFilter || undefined, pageSize: 50 },
        }),
        apiFetch<{ data: Resumo }>("/api/financeiro/resumo"),
      ]);
      setTransacoes(transRes.data.data);
      setTotal(transRes.data.total);
      setResumo(resumoRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tipoFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/financeiro/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Transação excluída", variant: "success" });
      load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo Cards */}
      {resumo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-[var(--muted-foreground)]">Total Entradas</span>
              </div>
              <p className="font-bold text-emerald-600 text-lg">{formatCurrency(resumo.totalEntradas)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-xs text-[var(--muted-foreground)]">Total Saídas</span>
              </div>
              <p className="font-bold text-red-500 text-lg">{formatCurrency(resumo.totalSaidas)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className={`w-4 h-4 ${resumo.saldo >= 0 ? "text-blue-600" : "text-red-500"}`} />
                <span className="text-xs text-[var(--muted-foreground)]">Saldo</span>
              </div>
              <p className={`font-bold text-lg ${resumo.saldo >= 0 ? "text-blue-600" : "text-red-500"}`}>{formatCurrency(resumo.saldo)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-[var(--muted-foreground)]">Pendente</span>
              </div>
              <p className="font-bold text-orange-500 text-lg">{formatCurrency(resumo.saldoPendente)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      {resumo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-sm">Fluxo de Caixa Mensal</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={resumo.fluxoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: "8px" }} />
                  <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Despesas por Categoria</CardTitle></CardHeader>
            <CardContent>
              {resumo.despesasPorCategoria.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={resumo.despesasPorCategoria} dataKey="total" nameKey="categoria" cx="50%" cy="50%" outerRadius={80} label={false}>
                      {resumo.despesasPorCategoria.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-56 flex items-center justify-center text-[var(--muted-foreground)] text-sm">Sem despesas</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <Input placeholder="Buscar transação..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ENTRADA">Entradas</SelectItem>
            <SelectItem value="SAIDA">Saídas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PAGO">Pago</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
            <SelectItem value="CANCELADO">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditTarget(null); setShowForm(true); setTipoFilter("ENTRADA"); }}>
            <Plus className="w-4 h-4" /> Entrada
          </Button>
          <Button onClick={() => { setEditTarget(null); setShowForm(true); setTipoFilter("SAIDA"); }}>
            <Plus className="w-4 h-4" /> Saída
          </Button>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-[var(--secondary)] animate-pulse" />)}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-xs text-[var(--muted-foreground)]">
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Descrição</th>
                  <th className="px-4 py-3 text-left font-medium">Categoria</th>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Obra</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--border)] hover:bg-[var(--secondary)] transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${t.tipo === "ENTRADA" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {t.tipo === "ENTRADA" ? "↑ Entrada" : "↓ Saída"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{t.descricao}</p>
                      {t.fornecedor && <p className="text-xs text-[var(--muted-foreground)]">{t.fornecedor}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{t.categoria}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{formatDate(t.data)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{t.obra?.nome}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[t.status] as "success" | "warning" | "secondary"}>{t.status}</Badge>
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-bold ${t.tipo === "ENTRADA" ? "text-emerald-600" : "text-red-500"}`}>
                      {t.tipo === "ENTRADA" ? "+" : "-"}{formatCurrency(t.valor)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditTarget(t); setShowForm(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setDeleteTarget(t)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transacoes.length === 0 && (
              <div className="text-center py-12 text-[var(--muted-foreground)]">Nenhuma transação encontrada</div>
            )}
          </div>
        </Card>
      )}

      {showForm && (
        <TransacaoFormDialog
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load(); }}
          tipoDefault={tipoFilter as "ENTRADA" | "SAIDA" || undefined}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir transação</DialogTitle>
            <DialogDescription>Excluir <strong>{deleteTarget?.descricao}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
