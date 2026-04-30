"use client";
import { useEffect, useState } from "react";
import { Plus, Building2, Users, Pencil, Trash2, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, UserPlus, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

interface Organization {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  createdAt: string;
  _count: { users: number; obras: number };
}

interface OrgUser {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
}

interface OrgForm {
  nome: string;
  slug: string;
  primeiroAdmin: {
    nome: string;
    email: string;
    senha: string;
  } | null;
}

interface UserForm {
  nome: string;
  email: string;
  senha: string;
  perfil: string;
}

export default function AdminPage() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const { apiFetch } = useApi();
  const { toast } = useToast();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [orgUsers, setOrgUsers] = useState<Record<string, OrgUser[]>>({});
  const [loadingUsers, setLoadingUsers] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [withAdmin, setWithAdmin] = useState(false);

  const emptyOrgForm = (): OrgForm => ({ nome: "", slug: "", primeiroAdmin: null });
  const [orgForm, setOrgForm] = useState<OrgForm>(emptyOrgForm());
  const [userForm, setUserForm] = useState<UserForm>({ nome: "", email: "", senha: "", perfil: "ADMIN" });

  useEffect(() => {
    if (!isSuperAdmin()) { router.push("/dashboard"); return; }
    loadOrgs();
  }, []);

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Organization[] }>("/api/admin/organizations");
      setOrgs(res.data);
    } catch { toast({ title: "Erro ao carregar organizações", variant: "error" }); }
    finally { setLoading(false); }
  };

  const loadOrgUsers = async (orgId: string) => {
    setLoadingUsers(orgId);
    try {
      const res = await apiFetch<{ data: OrgUser[] }>(`/api/admin/organizations/${orgId}/users`);
      setOrgUsers((prev) => ({ ...prev, [orgId]: res.data }));
    } catch { toast({ title: "Erro ao carregar usuários", variant: "error" }); }
    finally { setLoadingUsers(null); }
  };

  const toggleExpand = (orgId: string) => {
    if (expandedOrg === orgId) { setExpandedOrg(null); return; }
    setExpandedOrg(orgId);
    if (!orgUsers[orgId]) loadOrgUsers(orgId);
  };

  const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const openCreate = () => {
    setEditingOrg(null);
    setOrgForm(emptyOrgForm());
    setWithAdmin(false);
    setShowCreateOrg(true);
  };

  const startEdit = (org: Organization) => {
    setEditingOrg(org);
    setOrgForm({ nome: org.nome, slug: org.slug, primeiroAdmin: null });
    setWithAdmin(false);
    setShowCreateOrg(true);
  };

  const handleSaveOrg = async () => {
    if (!orgForm.nome || !orgForm.slug) return;
    setSaving(true);
    try {
      const body = editingOrg
        ? { nome: orgForm.nome, slug: orgForm.slug }
        : {
            nome: orgForm.nome,
            slug: orgForm.slug,
            ...(withAdmin && orgForm.primeiroAdmin ? { primeiroAdmin: orgForm.primeiroAdmin } : {}),
          };

      if (editingOrg) {
        await apiFetch(`/api/admin/organizations/${editingOrg.id}`, { method: "PUT", body });
        toast({ title: "Organização atualizada!", variant: "success" });
      } else {
        await apiFetch("/api/admin/organizations", { method: "POST", body });
        toast({ title: withAdmin && orgForm.primeiroAdmin ? "Organização e admin criados!" : "Organização criada!", variant: "success" });
      }
      setShowCreateOrg(false);
      setEditingOrg(null);
      loadOrgs();
    } catch (err) {
      toast({ title: "Erro ao salvar", description: (err as Error).message, variant: "error" });
    } finally { setSaving(false); }
  };

  const toggleOrgStatus = async (org: Organization) => {
    try {
      await apiFetch(`/api/admin/organizations/${org.id}`, {
        method: "PUT",
        body: { nome: org.nome, slug: org.slug, ativo: !org.ativo },
      });
      toast({ title: `Organização ${org.ativo ? "desativada" : "ativada"}!`, variant: "success" });
      loadOrgs();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    }
  };

  const deleteOrg = async (orgId: string) => {
    if (!confirm("Excluir esta organização? Todos os dados serão removidos permanentemente.")) return;
    try {
      await apiFetch(`/api/admin/organizations/${orgId}`, { method: "DELETE" });
      toast({ title: "Organização removida!", variant: "success" });
      loadOrgs();
    } catch (err) {
      toast({ title: "Erro ao excluir", description: (err as Error).message, variant: "error" });
    }
  };

  const addUser = async (orgId: string) => {
    if (!userForm.nome || !userForm.email || !userForm.senha) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/organizations/${orgId}/users`, { method: "POST", body: userForm });
      toast({ title: "Usuário criado!", variant: "success" });
      setShowAddUser(null);
      setUserForm({ nome: "", email: "", senha: "", perfil: "ADMIN" });
      setOrgUsers((prev) => ({ ...prev, [orgId]: [] }));
      loadOrgUsers(orgId);
    } catch (err) {
      toast({ title: "Erro ao criar usuário", description: (err as Error).message, variant: "error" });
    } finally { setSaving(false); }
  };

  const toggleUserStatus = async (orgId: string, userId: string, ativo: boolean) => {
    try {
      await apiFetch(`/api/admin/organizations/${orgId}/users?userId=${userId}`, {
        method: "PATCH",
        body: { ativo: !ativo },
      });
      toast({ title: `Usuário ${ativo ? "desativado" : "ativado"}!`, variant: "success" });
      loadOrgUsers(orgId);
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    }
  };

  const isFormValid = orgForm.nome && orgForm.slug &&
    (!withAdmin || !editingOrg
      ? !withAdmin || (orgForm.primeiroAdmin?.nome && orgForm.primeiroAdmin?.email && orgForm.primeiroAdmin?.senha)
      : true);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nova Organização
        </Button>
      </div>

      {/* Create / Edit form */}
      {showCreateOrg && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-[var(--foreground)]">
              {editingOrg ? "Editar Organização" : "Nova Organização"}
            </h3>

            {/* Org fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome da organização *</Label>
                <Input
                  placeholder="Construtora XYZ"
                  value={orgForm.nome}
                  onChange={(e) => {
                    const nome = e.target.value;
                    setOrgForm((p) => ({ ...p, nome, slug: editingOrg ? p.slug : slugify(nome) }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Código (slug) *</Label>
                <Input
                  placeholder="construtora-xyz"
                  value={orgForm.slug}
                  onChange={(e) => setOrgForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                />
                <p className="text-xs text-[var(--muted-foreground)]">Usado no login. Apenas letras, números e hífens.</p>
              </div>
            </div>

            {/* First admin toggle (only on create) */}
            {!editingOrg && (
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
                  onClick={() => setWithAdmin((v) => !v)}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--muted-foreground)]" />
                    Criar admin inicial para esta organização
                  </span>
                  {withAdmin ? <ChevronUp className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {withAdmin && (
                  <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome do admin *</Label>
                      <Input
                        className="h-8 text-sm"
                        placeholder="Nome completo"
                        value={orgForm.primeiroAdmin?.nome || ""}
                        onChange={(e) => setOrgForm((p) => ({ ...p, primeiroAdmin: { ...p.primeiroAdmin!, nome: e.target.value, email: p.primeiroAdmin?.email || "", senha: p.primeiroAdmin?.senha || "" } }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">E-mail *</Label>
                      <Input
                        className="h-8 text-sm"
                        type="email"
                        placeholder="admin@empresa.com"
                        value={orgForm.primeiroAdmin?.email || ""}
                        onChange={(e) => setOrgForm((p) => ({ ...p, primeiroAdmin: { ...p.primeiroAdmin!, nome: p.primeiroAdmin?.nome || "", email: e.target.value, senha: p.primeiroAdmin?.senha || "" } }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Senha inicial *</Label>
                      <Input
                        className="h-8 text-sm"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={orgForm.primeiroAdmin?.senha || ""}
                        onChange={(e) => setOrgForm((p) => ({ ...p, primeiroAdmin: { ...p.primeiroAdmin!, nome: p.primeiroAdmin?.nome || "", email: p.primeiroAdmin?.email || "", senha: e.target.value } }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowCreateOrg(false); setEditingOrg(null); }}>Cancelar</Button>
              <Button onClick={handleSaveOrg} disabled={saving || !isFormValid}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingOrg ? "Salvar" : "Criar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations list */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-[var(--secondary)] animate-pulse" />)}</div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
          <p className="text-[var(--muted-foreground)]">Nenhuma organização cadastrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <Card key={org.id} className={!org.ativo ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[var(--foreground)]">{org.nome}</h3>
                        <Badge variant="outline" className="text-[10px] font-mono">/{org.slug}</Badge>
                        <Badge className={org.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"} variant="outline">
                          {org.ativo ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                          <Users className="w-3 h-3" /> {org._count.users} usuário{org._count.users !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {org._count.obras} obra{org._count.obras !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(org)} className="h-8 w-8 p-0" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleOrgStatus(org)} className="h-8 w-8 p-0" title={org.ativo ? "Desativar" : "Ativar"}>
                      {org.ativo ? <XCircle className="w-3.5 h-3.5 text-orange-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteOrg(org.id)} className="h-8 w-8 p-0" title="Excluir">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleExpand(org.id)} className="h-8 px-2 gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {expandedOrg === org.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                {expandedOrg === org.id && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-[var(--foreground)]">Usuários</h4>
                      <Button size="sm" variant="outline" className="h-7" onClick={() => setShowAddUser(showAddUser === org.id ? null : org.id)}>
                        <UserPlus className="w-3.5 h-3.5" /> Adicionar
                      </Button>
                    </div>

                    {showAddUser === org.id && (
                      <div className="mb-4 p-3 bg-[var(--secondary)] rounded-lg space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nome *</Label>
                            <Input className="h-8 text-sm" placeholder="Nome completo" value={userForm.nome} onChange={(e) => setUserForm((p) => ({ ...p, nome: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">E-mail *</Label>
                            <Input className="h-8 text-sm" type="email" placeholder="email@empresa.com" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Senha *</Label>
                            <Input className="h-8 text-sm" type="password" placeholder="Senha inicial" value={userForm.senha} onChange={(e) => setUserForm((p) => ({ ...p, senha: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Perfil</Label>
                            <Select value={userForm.perfil} onValueChange={(v) => setUserForm((p) => ({ ...p, perfil: v }))}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADMIN">Administrador</SelectItem>
                                <SelectItem value="GERENTE">Gerente</SelectItem>
                                <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                                <SelectItem value="VISUALIZADOR">Visualizador</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setShowAddUser(null)}>Cancelar</Button>
                          <Button size="sm" onClick={() => addUser(org.id)} disabled={saving}>
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Criar usuário
                          </Button>
                        </div>
                      </div>
                    )}

                    {loadingUsers === org.id ? (
                      <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--muted-foreground)]" /></div>
                    ) : (orgUsers[org.id] || []).length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)] text-center py-3">Nenhum usuário cadastrado</p>
                    ) : (
                      <div className="space-y-2">
                        {(orgUsers[org.id] || []).map((u) => (
                          <div key={u.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--secondary)]">
                            <div>
                              <p className="text-sm font-medium text-[var(--foreground)]">{u.nome}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">{u.email} · {u.perfil}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={u.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"} variant="outline">
                                {u.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleUserStatus(org.id, u.id, u.ativo)}>
                                {u.ativo ? <XCircle className="w-3.5 h-3.5 text-orange-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
