"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Building2, MapPin, Calendar, Users, DollarSign, Filter, LayoutGrid, Table } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { formatCurrency, formatDate, STATUS_OBRA_LABELS, STATUS_OBRA_COLORS } from "@/lib/utils";
import { ObraFormDialog } from "@/components/forms/obra-form";

interface Obra {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  status: string;
  responsavel: string;
  cliente: string;
  dataInicio: string;
  dataPrevisaoFim: string;
  fotoPath: string | null;
  orcamentoPrevisto: number | null;
  totalEntradas: number;
  totalSaidas: number;
  saldoFinanceiro: number;
  _count: { funcionarios: number; maquinarios: number };
}

export default function ObrasPage() {
  const { apiFetch } = useApi();
  const [obras, setObras] = useState<Obra[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { data: Obra[]; total: number } }>("/api/obras", {
        params: { search: search || undefined, status: statusFilter || undefined, page, pageSize: 20 },
      });
      setObras(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Buscar obra, cliente, responsável..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="PLANEJAMENTO">Planejamento</SelectItem>
            <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
            <SelectItem value="PARALISADA">Paralisada</SelectItem>
            <SelectItem value="CONCLUIDA">Concluída</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border border-[var(--border)] rounded-md overflow-hidden">
          <button onClick={() => setView("cards")} className={`px-3 py-1.5 ${view === "cards" ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--secondary)]"}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView("table")} className={`px-3 py-1.5 ${view === "table" ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--secondary)]"}`}>
            <Table className="w-4 h-4" />
          </button>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Nova Obra
        </Button>
      </div>

      {/* Count */}
      <p className="text-sm text-[var(--muted-foreground)]">
        {total} obra{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-lg bg-[var(--secondary)] animate-pulse" />
          ))}
        </div>
      ) : obras.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
          <p className="text-[var(--muted-foreground)]">Nenhuma obra encontrada</p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Cadastrar primeira obra
          </Button>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {obras.map((obra) => (
            <Link key={obra.id} href={`/obras/${obra.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full group">
                <div className="h-36 bg-gradient-to-br from-slate-800 to-blue-900 rounded-t-lg flex items-center justify-center overflow-hidden relative">
                  {obra.fotoPath ? (
                    <img src={obra.fotoPath} alt={obra.nome} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-12 h-12 text-slate-600" />
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_OBRA_COLORS[obra.status]}`}>
                      {STATUS_OBRA_LABELS[obra.status]}
                    </span>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors leading-tight">{obra.nome}</h3>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{obra.cliente}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{obra.cidade}/{obra.estado}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{obra._count.funcionarios}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar className="w-3 h-3 text-[var(--muted-foreground)]" />
                      <span className="text-[var(--muted-foreground)]">{formatDate(obra.dataPrevisaoFim)}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-semibold ${obra.saldoFinanceiro >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(obra.saldoFinanceiro)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-xs text-[var(--muted-foreground)]">
                  <th className="px-4 py-3 text-left font-medium">Obra</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Responsável</th>
                  <th className="px-4 py-3 text-left font-medium">Prazo</th>
                  <th className="px-4 py-3 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {obras.map((obra) => (
                  <tr key={obra.id} className="border-b border-[var(--border)] hover:bg-[var(--secondary)] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/obras/${obra.id}`} className="hover:text-[var(--primary)]">
                        <p className="font-medium text-sm">{obra.nome}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{obra.cidade}/{obra.estado}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_OBRA_COLORS[obra.status]}`}>
                        {STATUS_OBRA_LABELS[obra.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{obra.responsavel}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{formatDate(obra.dataPrevisaoFim)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-semibold ${obra.saldoFinanceiro >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {formatCurrency(obra.saldoFinanceiro)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && (
        <ObraFormDialog
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
