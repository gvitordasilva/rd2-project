"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Wrench, AlertTriangle, Edit, Trash2, Loader2, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MaquinarioFormDialog } from "@/components/forms/maquinario-form";

interface Maquinario {
  id: string;
  nome: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  status: string;
  locadoraNome: string | null;
  locadoraContato: string | null;
  dataVencimentoLocacao: string | null;
  valorLocacao: number | null;
  periodicidadeLocacao: string | null;
  contratoPath: string | null;
  obra: { id: string; nome: string };
}

function diasAteVencimento(data: string): number {
  return Math.floor((new Date(data).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
}

export default function MaquinariosPage() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [maquinarios, setMaquinarios] = useState<Maquinario[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Maquinario | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Maquinario | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { data: Maquinario[]; total: number } }>("/api/maquinarios", {
        params: { search: search || undefined, status: statusFilter || undefined, pageSize: 50 },
      });
      setMaquinarios(res.data.data);
      setTotal(res.data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/maquinarios/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Equipamento excluído", variant: "success" });
      load();
    } catch (err) {
      toast({ title: "Erro ao excluir", description: (err as Error).message, variant: "error" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <Input placeholder="Buscar equipamento..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PROPRIO">Próprio</SelectItem>
            <SelectItem value="LOCADO">Locado</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditTarget(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Novo Equipamento
        </Button>
      </div>

      <p className="text-sm text-[var(--muted-foreground)]">{total} equipamento{total !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 rounded-lg bg-[var(--secondary)] animate-pulse" />)}
        </div>
      ) : maquinarios.length === 0 ? (
        <div className="text-center py-20">
          <Wrench className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
          <p className="text-[var(--muted-foreground)]">Nenhum equipamento cadastrado</p>
          <Button className="mt-4" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Cadastrar equipamento</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {maquinarios.map((m) => {
            const dias = m.dataVencimentoLocacao ? diasAteVencimento(m.dataVencimentoLocacao) : null;
            return (
              <Card key={m.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{m.nome}</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">{m.tipo}{m.marca ? ` · ${m.marca}` : ""}</p>
                    </div>
                  </div>
                  <Badge variant={m.status === "PROPRIO" ? "secondary" : "info"}>
                    {m.status === "PROPRIO" ? "Próprio" : "Locado"}
                  </Badge>
                </div>

                {m.status === "LOCADO" && (
                  <div className="space-y-1.5 p-3 bg-[var(--secondary)] rounded-lg">
                    <p className="text-xs text-[var(--muted-foreground)]">Locadora: <span className="font-medium text-[var(--foreground)]">{m.locadoraNome}</span></p>
                    {m.valorLocacao && <p className="text-xs text-[var(--muted-foreground)]">Valor: <span className="font-medium text-[var(--foreground)]">{formatCurrency(m.valorLocacao)}</span></p>}
                    {m.dataVencimentoLocacao && (
                      <div className="flex items-center gap-1.5">
                        {dias !== null && dias <= 7 && <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          dias === null ? "" : dias < 0 ? "bg-red-100 text-red-700" : dias <= 3 ? "bg-red-100 text-red-700" : dias <= 7 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                        }`}>
                          {dias === null ? "" : dias < 0 ? `Vencido há ${Math.abs(dias)}d` : `Vence em ${dias}d (${formatDate(m.dataVencimentoLocacao)})`}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-[var(--muted-foreground)]">{m.obra.nome}</p>
                  <div className="flex gap-1">
                    {m.contratoPath && (
                      <a href={m.contratoPath} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost"><FileText className="w-4 h-4" /></Button>
                      </a>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { setEditTarget(m); setShowForm(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setDeleteTarget(m)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <MaquinarioFormDialog
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load(); }}
          initialData={editTarget ? { id: editTarget.id, nome: editTarget.nome, tipo: editTarget.tipo, marca: editTarget.marca ?? undefined, modelo: editTarget.modelo ?? undefined, status: editTarget.status as "PROPRIO" | "LOCADO", locadoraNome: editTarget.locadoraNome ?? undefined, locadoraContato: editTarget.locadoraContato ?? undefined, dataVencimentoLocacao: editTarget.dataVencimentoLocacao ? editTarget.dataVencimentoLocacao.split("T")[0] : undefined, periodicidadeLocacao: editTarget.periodicidadeLocacao as "DIARIO" | "SEMANAL" | "QUINZENAL" | "MENSAL" | undefined, obraId: editTarget.obra.id, valorLocacao: editTarget.valorLocacao !== null ? String(editTarget.valorLocacao) : undefined } : undefined}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir equipamento</DialogTitle>
            <DialogDescription>Excluir <strong>{deleteTarget?.nome}</strong>?</DialogDescription>
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
