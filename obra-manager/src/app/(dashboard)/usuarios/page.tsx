"use client";
import { useEffect, useState } from "react";
import { Plus, Users, Loader2, CheckCircle2, XCircle, UserCog } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";

interface OrgUser {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  createdAt: string;
}

const PERFIL_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  FINANCEIRO: "Financeiro",
  VISUALIZADOR: "Visualizador",
};

const PERFIL_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  GERENTE: "bg-blue-100 text-blue-700",
  FINANCEIRO: "bg-emerald-100 text-emerald-700",
  VISUALIZADOR: "bg-slate-100 text-slate-600",
};

interface UserForm {
  nome: string;
  email: string;
  senha: string;
  perfil: string;
}

export default function UsuariosPage() {
  const { apiFetch } = useApi();
  const { user: currentUser, isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserForm>({ nome: "", email: "", senha: "", perfil: "GERENTE" });

  const canManage = isAdmin();

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: OrgUser[] }>("/api/users");
      setUsers(res.data);
    } catch { toast({ title: "Erro ao carregar usuários", variant: "error" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.nome || !form.email || !form.senha) return;
    setSaving(true);
    try {
      await apiFetch("/api/users", { method: "POST", body: form });
      toast({ title: "Usuário criado!", variant: "success" });
      setShowForm(false);
      setForm({ nome: "", email: "", senha: "", perfil: "GERENTE" });
      load();
    } catch (err) {
      toast({ title: "Erro ao criar", description: (err as Error).message, variant: "error" });
    } finally { setSaving(false); }
  };

  const toggleStatus = async (u: OrgUser) => {
    try {
      await apiFetch(`/api/users?userId=${u.id}`, { method: "PATCH", body: { ativo: !u.ativo } });
      toast({ title: `Usuário ${u.ativo ? "desativado" : "ativado"}!`, variant: "success" });
      load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    }
  };

  const updatePerfil = async (u: OrgUser, perfil: string) => {
    try {
      await apiFetch(`/api/users?userId=${u.id}`, { method: "PATCH", body: { perfil } });
      toast({ title: "Perfil atualizado!", variant: "success" });
      load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Novo Usuário
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-[var(--secondary)] animate-pulse" />)}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
          <p className="text-[var(--muted-foreground)]">Nenhum usuário cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className={!u.ativo ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                      <span className="text-white text-sm font-semibold">{u.nome.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-[var(--foreground)]">{u.nome}</p>
                        {u.id === currentUser?.id && (
                          <Badge variant="outline" className="text-[10px] bg-[var(--secondary)]">você</Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] ${PERFIL_COLORS[u.perfil]}`}>
                          {PERFIL_LABELS[u.perfil] || u.perfil}
                        </Badge>
                        {!u.ativo && <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500">Inativo</Badge>}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{u.email}</p>
                    </div>
                  </div>

                  {canManage && u.id !== currentUser?.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Select value={u.perfil} onValueChange={(v) => updatePerfil(u, v)}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                          <SelectItem value="GERENTE">Gerente</SelectItem>
                          <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                          <SelectItem value="VISUALIZADOR">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm" variant="ghost"
                        className="h-8 w-8 p-0"
                        title={u.ativo ? "Desativar" : "Ativar"}
                        onClick={() => toggleStatus(u)}
                      >
                        {u.ativo
                          ? <XCircle className="w-4 h-4 text-orange-500" />
                          : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" /> Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Nome completo" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" placeholder="email@empresa.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Senha inicial *</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={form.senha} onChange={(e) => setForm((p) => ({ ...p, senha: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil *</Label>
              <Select value={form.perfil} onValueChange={(v) => setForm((p) => ({ ...p, perfil: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="GERENTE">Gerente</SelectItem>
                  <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                  <SelectItem value="VISUALIZADOR">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.nome || !form.email || !form.senha}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
