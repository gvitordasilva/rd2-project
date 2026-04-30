"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Users, Phone, DollarSign, AlertTriangle, Edit, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate, TIPO_FUNC_LABELS, PERIODICIDADE_LABELS } from "@/lib/utils";
import { FuncionarioFormDialog } from "@/components/forms/funcionario-form";

interface Funcionario {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  tipo: string;
  valorPagamento: number;
  periodicidade: string;
  status: string;
  contato: string | null;
  dataAdmissao: string;
  obra: { id: string; nome: string };
  _count: { pagamentos: number };
}

export default function FuncionariosPage() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Funcionario | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Funcionario | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { data: Funcionario[]; total: number } }>("/api/funcionarios", {
        params: { search: search || undefined, status: statusFilter || undefined, pageSize: 50 },
      });
      setFuncionarios(res.data.data);
      setTotal(res.data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/funcionarios/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Funcionário excluído", variant: "success" });
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
          <Input placeholder="Buscar por nome, cargo, CPF..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="ATIVO">Ativo</SelectItem>
            <SelectItem value="INATIVO">Inativo</SelectItem>
            <SelectItem value="AFASTADO">Afastado</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditTarget(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Novo Funcionário
        </Button>
      </div>

      <p className="text-sm text-[var(--muted-foreground)]">{total} funcionário{total !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-[var(--secondary)] animate-pulse" />)}</div>
      ) : funcionarios.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
          <p className="text-[var(--muted-foreground)]">Nenhum funcionário encontrado</p>
          <Button className="mt-4" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Cadastrar funcionário</Button>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-xs text-[var(--muted-foreground)]">
                  <th className="px-4 py-3 text-left font-medium">Funcionário</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Remuneração</th>
                  <th className="px-4 py-3 text-left font-medium">Obra</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Admissão</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((f) => (
                  <tr key={f.id} className="border-b border-[var(--border)] hover:bg-[var(--secondary)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold shrink-0">{f.nome.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-medium">{f.nome}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{f.cargo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{TIPO_FUNC_LABELS[f.tipo]}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold">{formatCurrency(f.valorPagamento)}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{PERIODICIDADE_LABELS[f.periodicidade]}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{f.obra.nome}</td>
                    <td className="px-4 py-3">
                      <Badge variant={f.status === "ATIVO" ? "success" : f.status === "AFASTADO" ? "warning" : "secondary"}>
                        {f.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{formatDate(f.dataAdmissao)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditTarget(f); setShowForm(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(f)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && (
        <FuncionarioFormDialog
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load(); }}
          initialData={editTarget ? { id: editTarget.id, nome: editTarget.nome, cpf: editTarget.cpf, cargo: editTarget.cargo, tipo: editTarget.tipo as "CLT" | "PJ" | "DIARIA" | "EMPREITEIRO", valorPagamento: String(editTarget.valorPagamento), periodicidade: editTarget.periodicidade as "DIARIO" | "SEMANAL" | "QUINZENAL" | "MENSAL", status: editTarget.status as "ATIVO" | "INATIVO" | "AFASTADO", contato: editTarget.contato ?? undefined, dataAdmissao: editTarget.dataAdmissao.split("T")[0], obraId: editTarget.obra.id } : undefined}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir funcionário</DialogTitle>
            <DialogDescription>
              Excluir <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
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
