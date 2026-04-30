"use client";
import { useEffect, useState } from "react";
import { Plus, Briefcase, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";

interface Cargo {
  id: string;
  nome: string;
  descricao: string | null;
}

export default function CargosPage() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Cargo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cargo | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Cargo[] }>("/api/cargos");
      setCargos(res.data);
    } catch { toast({ title: "Erro ao carregar cargos", variant: "error" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ nome: "", descricao: "" });
    setShowForm(true);
  };

  const openEdit = (c: Cargo) => {
    setEditTarget(c);
    setForm({ nome: c.nome, descricao: c.descricao || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      const body = { nome: form.nome.trim(), descricao: form.descricao.trim() || undefined };
      if (editTarget) {
        await apiFetch(`/api/cargos/${editTarget.id}`, { method: "PUT", body });
        toast({ title: "Cargo atualizado!", variant: "success" });
      } else {
        await apiFetch("/api/cargos", { method: "POST", body });
        toast({ title: "Cargo criado!", variant: "success" });
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast({ title: "Erro ao salvar", description: (err as Error).message, variant: "error" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/cargos/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Cargo removido!", variant: "success" });
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast({ title: "Erro ao excluir", description: (err as Error).message, variant: "error" });
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Novo Cargo
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-[var(--secondary)] animate-pulse" />)}
        </div>
      ) : cargos.length === 0 ? (
        <div className="text-center py-20">
          <Briefcase className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
          <p className="text-[var(--muted-foreground)] font-medium">Nenhum cargo cadastrado</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Cadastre os cargos da sua empresa para usar no cadastro de funcionários</p>
          <Button className="mt-4" onClick={openCreate}><Plus className="w-4 h-4" /> Criar primeiro cargo</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cargos.map((c) => (
            <Card key={c.id} className="group">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--foreground)] truncate">{c.nome}</p>
                    {c.descricao && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{c.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(c)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Cargo" : "Novo Cargo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Pedreiro, Eletricista, Mestre de Obras..."
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição <span className="text-[var(--muted-foreground)]">(opcional)</span></Label>
              <Input
                placeholder="Breve descrição das atividades"
                value={form.descricao}
                onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.nome.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editTarget ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir cargo</DialogTitle>
            <DialogDescription>
              Excluir o cargo <strong>{deleteTarget?.nome}</strong>? Funcionários vinculados a este cargo não serão afetados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
