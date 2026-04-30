"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Loader2, Trash2, Pencil, Calculator } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";

interface OrcRow {
  type: string;
  total: number | null;
  pendente?: boolean;
}

interface Orcamento {
  id: string;
  titulo: string;
  cliente?: string;
  nomeObra?: string;
  area: number;
  status: string;
  rows: OrcRow[];
  margem: number;
  desconto: number;
  createdAt: string;
  updatedAt: string;
}

function calcTotal(orc: Orcamento) {
  let total = 0;
  for (const r of orc.rows) {
    if (r.type === "item" && !r.pendente && r.total != null) total += r.total;
  }
  const com = total * (1 + orc.margem / 100);
  return com * (1 - orc.desconto / 100);
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_COLORS: Record<string, string> = {
  RASCUNHO: "bg-slate-100 text-slate-600",
  ENVIADO: "bg-blue-100 text-blue-700",
  APROVADO: "bg-emerald-100 text-emerald-700",
  REJEITADO: "bg-red-100 text-red-700",
};

export default function OrcamentosPage() {
  const router = useRouter();
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [list, setList] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Orcamento | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Orcamento[] }>("/api/orcamentos");
      setList(res.data);
    } catch {
      toast({ title: "Erro ao carregar orçamentos", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await apiFetch<{ data: { id: string } }>("/api/orcamentos", {
        method: "POST",
        body: { titulo: "Novo Orçamento" },
      });
      router.push(`/orcamentos/${res.data.id}`);
    } catch {
      toast({ title: "Erro ao criar orçamento", variant: "error" });
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/orcamentos/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Orçamento excluído!", variant: "success" });
      setDeleteTarget(null);
      load();
    } catch {
      toast({ title: "Erro ao excluir", variant: "error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Novo Orçamento
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-[var(--secondary)] animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-24">
          <Calculator className="w-14 h-14 mx-auto text-[var(--muted-foreground)] mb-4" />
          <p className="font-medium text-[var(--foreground)]">Nenhum orçamento criado</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1 mb-4">
            Crie orçamentos profissionais com planilha detalhada e proposta formatada
          </p>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Criar primeiro orçamento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((orc) => {
            const total = calcTotal(orc);
            const pendentes = orc.rows.filter(
              (r) => r.type === "item" && (r.pendente || r.total == null)
            ).length;
            return (
              <Card
                key={orc.id}
                className="group hover:border-[var(--primary)] transition-colors"
              >
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--foreground)] truncate">
                          {orc.titulo}
                        </p>
                        {orc.cliente && (
                          <p className="text-xs text-[var(--muted-foreground)] truncate">
                            {orc.cliente}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${STATUS_COLORS[orc.status] || ""}`}
                    >
                      {orc.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                    {orc.nomeObra && <span className="truncate">{orc.nomeObra}</span>}
                    {orc.area > 0 && (
                      <span className="shrink-0">{orc.area.toLocaleString("pt-BR")} m²</span>
                    )}
                  </div>

                  <div className="flex items-end justify-between pt-1 border-t border-[var(--border)]">
                    <div>
                      <p className="text-lg font-bold text-amber-500">{fmt(total)}</p>
                      {pendentes > 0 && (
                        <p className="text-[10px] text-red-500">
                          + {pendentes} item(ns) pendente(s)
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => router.push(`/orcamentos/${orc.id}`)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        onClick={() => setDeleteTarget(orc)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    Atualizado em{" "}
                    {new Date(orc.updatedAt).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir orçamento</DialogTitle>
            <DialogDescription>
              Excluir <strong>{deleteTarget?.titulo}</strong>? Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
