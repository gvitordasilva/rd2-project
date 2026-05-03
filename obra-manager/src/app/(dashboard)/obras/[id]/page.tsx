"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import {
  Building2, MapPin, Calendar, Users, Wrench, DollarSign, Edit, Trash2,
  TrendingUp, TrendingDown, AlertTriangle, Loader2, Plus, Package,
  GitBranch, ArrowDown, ArrowUp, RotateCcw, AlertCircle, CheckCircle2, Clock, PauseCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { ObraFormDialog } from "@/components/forms/obra-form";
import { EtapaFormDialog } from "@/components/forms/etapa-form";
import { ItemEstoqueFormDialog, MovimentacaoFormDialog } from "@/components/forms/estoque-form";
import { formatCurrency, formatDate, STATUS_OBRA_LABELS, STATUS_OBRA_COLORS } from "@/lib/utils";
import { differenceInDays } from "date-fns";

interface Funcionario {
  id: string; nome: string; cargo: string; tipo: string; status: string;
  valorPagamento: number; periodicidade: string; contato: string | null;
  dataAdmissao: string; cpf: string;
}
interface Maquinario {
  id: string; nome: string; tipo: string; marca: string | null; modelo: string | null;
  numeroSerie: string | null; status: string; locadoraNome: string | null;
  locadoraContato: string | null; dataInicioLocacao: string | null;
  dataVencimentoLocacao: string | null; valorLocacao: number | null;
  periodicidadeLocacao: string | null; observacoes: string | null;
}
interface EtapaObra {
  id: string; nome: string; descricao: string | null; ordem: number;
  status: string; percentual: number; valorPrevisto: number | null;
  dataInicioPrev: string | null; dataFimPrev: string | null;
  dataInicioReal: string | null; dataFimReal: string | null;
  observacoes: string | null;
}
interface ItemEstoque {
  id: string; nome: string; unidade: string; categoria: string | null;
  quantidadeAtual: number; quantidadeMinima: number | null; valorUnitario: number | null;
  _count: { movimentacoes: number };
}
interface ObraDetalhe {
  id: string; nome: string; endereco: string; bairro: string | null;
  cidade: string; estado: string; cep: string; responsavel: string; cliente: string;
  dataInicio: string; dataPrevisaoFim: string; status: string;
  descricao: string | null; orcamentoPrevisto: number | null; fotoPath: string | null;
  totalEntradas: number; totalSaidas: number; saldoFinanceiro: number;
  _count: { funcionarios: number; maquinarios: number; transacoes: number; documentos: number };
  funcionarios: Funcionario[]; maquinarios: Maquinario[];
  alertas: { id: string; tipo: string; mensagem: string; createdAt: string }[];
}

const ETAPA_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDENTE: { label: "Pendente", color: "bg-slate-100 text-slate-700", icon: <Clock className="w-3.5 h-3.5" /> },
  EM_ANDAMENTO: { label: "Em Andamento", color: "bg-blue-100 text-blue-700", icon: <Building2 className="w-3.5 h-3.5" /> },
  CONCLUIDA: { label: "Concluída", color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  PARALISADA: { label: "Paralisada", color: "bg-red-100 text-red-700", icon: <PauseCircle className="w-3.5 h-3.5" /> },
};

export default function ObraDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { apiFetch } = useApi();
  const { toast } = useToast();

  const [obra, setObra] = useState<ObraDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [etapas, setEtapas] = useState<EtapaObra[]>([]);
  const [loadingEtapas, setLoadingEtapas] = useState(false);
  const [showEtapaForm, setShowEtapaForm] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<EtapaObra | null>(null);
  const [showDeleteEtapa, setShowDeleteEtapa] = useState<EtapaObra | null>(null);
  const [deletingEtapa, setDeletingEtapa] = useState(false);

  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [loadingEstoque, setLoadingEstoque] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemEstoque | null>(null);
  const [showMovForm, setShowMovForm] = useState<ItemEstoque | null>(null);
  const [showDeleteItem, setShowDeleteItem] = useState<ItemEstoque | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const loadObra = useCallback(() => {
    setLoading(true);
    apiFetch<{ data: ObraDetalhe }>(`/api/obras/${params.id}`)
      .then((res) => setObra(res.data))
      .catch(() => toast({ title: "Obra não encontrada", variant: "error" }))
      .finally(() => setLoading(false));
  }, [params.id]);

  const loadEtapas = useCallback(() => {
    setLoadingEtapas(true);
    apiFetch<{ data: EtapaObra[] }>(`/api/obras/${params.id}/etapas`)
      .then((res) => setEtapas(res.data))
      .catch(() => {})
      .finally(() => setLoadingEtapas(false));
  }, [params.id]);

  const loadEstoque = useCallback(() => {
    setLoadingEstoque(true);
    apiFetch<{ data: ItemEstoque[] }>(`/api/obras/${params.id}/estoque`)
      .then((res) => setEstoque(res.data))
      .catch(() => {})
      .finally(() => setLoadingEstoque(false));
  }, [params.id]);

  useEffect(() => {
    loadObra();
    loadEtapas();
    loadEstoque();
  }, [params.id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/api/obras/${params.id}`, { method: "DELETE" });
      toast({ title: "Obra excluída", variant: "success" });
      router.push("/obras");
    } catch (err) {
      toast({ title: "Erro ao excluir", description: (err as Error).message, variant: "error" });
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handleDeleteEtapa = async () => {
    if (!showDeleteEtapa) return;
    setDeletingEtapa(true);
    try {
      await apiFetch(`/api/obras/${params.id}/etapas/${showDeleteEtapa.id}`, { method: "DELETE" });
      toast({ title: "Etapa removida", variant: "success" });
      loadEtapas();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    } finally {
      setDeletingEtapa(false);
      setShowDeleteEtapa(null);
    }
  };

  const handleDeleteItem = async () => {
    if (!showDeleteItem) return;
    setDeletingItem(true);
    try {
      await apiFetch(`/api/estoque/${showDeleteItem.id}`, { method: "DELETE" });
      toast({ title: "Item removido", variant: "success" });
      loadEstoque();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    } finally {
      setDeletingItem(false);
      setShowDeleteItem(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }
  if (!obra) return <div className="text-center py-20">Obra não encontrada</div>;

  const diasRestantes = differenceInDays(new Date(obra.dataPrevisaoFim), new Date());

  // Progresso médio das etapas
  const progressoGeral = etapas.length > 0
    ? Math.round(etapas.reduce((acc, e) => acc + e.percentual, 0) / etapas.length)
    : null;

  // Itens abaixo do mínimo
  const itensAbaixoMinimo = estoque.filter(
    (i) => i.quantidadeMinima != null && Number(i.quantidadeAtual) < Number(i.quantidadeMinima)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold">{obra.nome}</h2>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_OBRA_COLORS[obra.status]}`}>
              {STATUS_OBRA_LABELS[obra.status]}
            </span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {obra.endereco}{obra.bairro ? `, ${obra.bairro}` : ""} — {obra.cidade}/{obra.estado}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEdit(true)}>
            <Edit className="w-4 h-4" /> Editar
          </Button>
          <Button variant="destructive" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-[var(--muted-foreground)]">Entradas</span>
            </div>
            <p className="font-bold text-emerald-600">{formatCurrency(obra.totalEntradas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs text-[var(--muted-foreground)]">Saídas</span>
            </div>
            <p className="font-bold text-red-500">{formatCurrency(obra.totalSaidas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className={`w-4 h-4 ${obra.saldoFinanceiro >= 0 ? "text-blue-600" : "text-red-500"}`} />
              <span className="text-xs text-[var(--muted-foreground)]">Saldo</span>
            </div>
            <p className={`font-bold ${obra.saldoFinanceiro >= 0 ? "text-blue-600" : "text-red-500"}`}>
              {formatCurrency(obra.saldoFinanceiro)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className={`w-4 h-4 ${diasRestantes < 0 ? "text-red-500" : diasRestantes <= 7 ? "text-orange-500" : "text-slate-500"}`} />
              <span className="text-xs text-[var(--muted-foreground)]">Prazo</span>
            </div>
            <p className={`font-bold text-sm ${diasRestantes < 0 ? "text-red-500" : diasRestantes <= 7 ? "text-orange-500" : ""}`}>
              {diasRestantes < 0 ? `${Math.abs(diasRestantes)}d atraso` : `${diasRestantes}d restantes`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="flex gap-1 border-b border-[var(--border)] pb-0 mb-6 overflow-x-auto">
          {[
            { value: "info", label: "Informações" },
            { value: "etapas", label: `Etapas (${etapas.length})${progressoGeral != null ? ` · ${progressoGeral}%` : ""}` },
            { value: "estoque", label: `Estoque (${estoque.length})${itensAbaixoMinimo.length > 0 ? ` ⚠ ${itensAbaixoMinimo.length}` : ""}` },
            { value: "funcionarios", label: `Funcionários (${obra._count.funcionarios})` },
            { value: "maquinarios", label: `Maquinário (${obra._count.maquinarios})` },
            { value: "alertas", label: `Alertas (${obra.alertas.length})` },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="whitespace-nowrap px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] border-b-2 border-transparent data-[state=active]:border-[var(--primary)] data-[state=active]:text-[var(--primary)] transition-colors"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* INFO */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Dados da Obra</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Cliente</span><span className="font-medium">{obra.cliente}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Responsável</span><span className="font-medium">{obra.responsavel}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Início</span><span>{formatDate(obra.dataInicio)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Previsão</span><span>{formatDate(obra.dataPrevisaoFim)}</span></div>
                {obra.orcamentoPrevisto && (
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Orçamento</span><span className="font-medium">{formatCurrency(obra.orcamentoPrevisto)}</span></div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Descrição</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--muted-foreground)]">{obra.descricao || "Sem descrição"}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ETAPAS */}
        <TabsContent value="etapas">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Cronograma de Etapas</h3>
                {progressoGeral != null && (
                  <p className="text-sm text-[var(--muted-foreground)]">Avanço médio: {progressoGeral}%</p>
                )}
              </div>
              <Button size="sm" onClick={() => { setEditingEtapa(null); setShowEtapaForm(true); }}>
                <Plus className="w-4 h-4" /> Nova Etapa
              </Button>
            </div>

            {/* Barra de progresso geral */}
            {etapas.length > 0 && (
              <div className="w-full bg-[var(--secondary)] rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-[var(--primary)] rounded-full transition-all"
                  style={{ width: `${progressoGeral ?? 0}%` }}
                />
              </div>
            )}

            {loadingEtapas ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" /></div>
            ) : etapas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <GitBranch className="w-10 h-10 mx-auto text-[var(--muted-foreground)] mb-3" />
                  <p className="text-[var(--muted-foreground)] mb-4">Nenhuma etapa cadastrada</p>
                  <Button size="sm" onClick={() => setShowEtapaForm(true)}><Plus className="w-4 h-4" /> Criar primeira etapa</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {etapas.map((e) => {
                  const st = ETAPA_STATUS[e.status] ?? ETAPA_STATUS.PENDENTE;
                  return (
                    <Card key={e.id} className="group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-[var(--secondary)] flex items-center justify-center shrink-0 text-xs font-bold text-[var(--muted-foreground)]">
                              {e.ordem + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-semibold text-[var(--foreground)]">{e.nome}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                                  {st.icon}{st.label}
                                </span>
                              </div>
                              {e.descricao && <p className="text-xs text-[var(--muted-foreground)] mb-2">{e.descricao}</p>}

                              {/* Barra de progresso individual */}
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 bg-[var(--secondary)] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${e.status === "CONCLUIDA" ? "bg-emerald-500" : e.status === "PARALISADA" ? "bg-red-400" : "bg-[var(--primary)]"}`}
                                    style={{ width: `${e.percentual}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-[var(--muted-foreground)] w-8 text-right">{e.percentual}%</span>
                              </div>

                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                                {(e.dataInicioPrev || e.dataFimPrev) && (
                                  <span>Prev: {e.dataInicioPrev ? formatDate(e.dataInicioPrev) : "—"} → {e.dataFimPrev ? formatDate(e.dataFimPrev) : "—"}</span>
                                )}
                                {(e.dataInicioReal || e.dataFimReal) && (
                                  <span>Real: {e.dataInicioReal ? formatDate(e.dataInicioReal) : "—"} → {e.dataFimReal ? formatDate(e.dataFimReal) : "—"}</span>
                                )}
                                {e.valorPrevisto != null && (
                                  <span>Previsto: {formatCurrency(e.valorPrevisto)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingEtapa(e); setShowEtapaForm(true); }}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setShowDeleteEtapa(e)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ESTOQUE */}
        <TabsContent value="estoque">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Controle de Estoque</h3>
                <p className="text-sm text-[var(--muted-foreground)]">Materiais e insumos desta obra</p>
              </div>
              <Button size="sm" onClick={() => { setEditingItem(null); setShowItemForm(true); }}>
                <Plus className="w-4 h-4" /> Novo Material
              </Button>
            </div>

            {itensAbaixoMinimo.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {itensAbaixoMinimo.length} {itensAbaixoMinimo.length === 1 ? "item abaixo" : "itens abaixo"} do estoque mínimo
                  </p>
                  <p className="text-xs text-amber-700">
                    {itensAbaixoMinimo.map((i) => i.nome).join(", ")}
                  </p>
                </div>
              </div>
            )}

            {loadingEstoque ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" /></div>
            ) : estoque.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-10 h-10 mx-auto text-[var(--muted-foreground)] mb-3" />
                  <p className="text-[var(--muted-foreground)] mb-4">Nenhum material cadastrado</p>
                  <Button size="sm" onClick={() => setShowItemForm(true)}><Plus className="w-4 h-4" /> Cadastrar material</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--secondary)] text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Material</th>
                      <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Categoria</th>
                      <th className="px-4 py-3 text-right font-medium">Saldo</th>
                      <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Mínimo</th>
                      <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Valor Unitário</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {estoque.map((item) => {
                      const abaixoMin = item.quantidadeMinima != null && Number(item.quantidadeAtual) < Number(item.quantidadeMinima);
                      return (
                        <tr key={item.id} className="hover:bg-[var(--secondary)] transition-colors group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {abaixoMin && <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                              <span className="font-medium">{item.nome}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)] hidden sm:table-cell">{item.categoria || "—"}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-semibold ${abaixoMin ? "text-amber-600" : "text-[var(--foreground)]"}`}>
                              {Number(item.quantidadeAtual).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
                            </span>
                            <span className="text-xs text-[var(--muted-foreground)] ml-1">{item.unidade}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--muted-foreground)] hidden sm:table-cell">
                            {item.quantidadeMinima != null ? `${Number(item.quantidadeMinima)} ${item.unidade}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--muted-foreground)] hidden md:table-cell">
                            {item.valorUnitario != null ? formatCurrency(item.valorUnitario) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" title="Entrada/Saída" onClick={() => setShowMovForm(item)}>
                                <ArrowDown className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => { setEditingItem(item); setShowItemForm(true); }}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" title="Remover" onClick={() => setShowDeleteItem(item)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* FUNCIONÁRIOS */}
        <TabsContent value="funcionarios">
          {obra.funcionarios.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-10 h-10 mx-auto text-[var(--muted-foreground)] mb-3" />
                <p className="text-[var(--muted-foreground)] mb-4">Nenhum funcionário cadastrado nesta obra</p>
                <a href="/funcionarios">
                  <Button size="sm"><Plus className="w-4 h-4" /> Cadastrar funcionário</Button>
                </a>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {obra.funcionarios.map((f) => {
                const TIPO_COLORS: Record<string, string> = {
                  CLT: "bg-blue-100 text-blue-700", PJ: "bg-purple-100 text-purple-700",
                  DIARIA: "bg-amber-100 text-amber-700", EMPREITEIRO: "bg-orange-100 text-orange-700",
                };
                const PERIODO_LABEL: Record<string, string> = {
                  DIARIO: "dia", SEMANAL: "sem.", QUINZENAL: "quin.", MENSAL: "mês",
                };
                return (
                  <Card key={f.id} className={f.status !== "ATIVO" ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {f.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--foreground)]">{f.nome}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{f.cargo}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIPO_COLORS[f.tipo] || "bg-slate-100 text-slate-600"}`}>{f.tipo}</span>
                          <Badge variant={f.status === "ATIVO" ? "success" : f.status === "AFASTADO" ? "outline" : "secondary"}>{f.status}</Badge>
                        </div>
                      </div>
                      <div className="border-t border-[var(--border)] pt-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                        <div>
                          <p className="text-[var(--muted-foreground)] mb-0.5">Remuneração</p>
                          <p className="font-semibold text-[var(--foreground)]">
                            {formatCurrency(f.valorPagamento)}
                            <span className="text-[var(--muted-foreground)] font-normal">/{PERIODO_LABEL[f.periodicidade] || f.periodicidade}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)] mb-0.5">Admissão</p>
                          <p className="font-medium">{formatDate(f.dataAdmissao)}</p>
                        </div>
                        {f.contato && (
                          <div>
                            <p className="text-[var(--muted-foreground)] mb-0.5">Contato</p>
                            <p className="font-medium">{f.contato}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[var(--muted-foreground)] mb-0.5">CPF</p>
                          <p className="font-medium font-mono">{f.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "***.$2.***-**")}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* MAQUINÁRIOS */}
        <TabsContent value="maquinarios">
          {obra.maquinarios.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Wrench className="w-10 h-10 mx-auto text-[var(--muted-foreground)] mb-3" />
                <p className="text-[var(--muted-foreground)] mb-4">Nenhum equipamento cadastrado nesta obra</p>
                <a href="/maquinarios">
                  <Button size="sm"><Plus className="w-4 h-4" /> Cadastrar equipamento</Button>
                </a>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {obra.maquinarios.map((m) => {
                const diasVenc = m.dataVencimentoLocacao ? differenceInDays(new Date(m.dataVencimentoLocacao), new Date()) : null;
                const vencColor = diasVenc === null ? "" : diasVenc < 0 ? "text-red-600" : diasVenc <= 7 ? "text-orange-500" : "text-emerald-600";
                const vencBg = diasVenc === null ? "" : diasVenc < 0 ? "bg-red-50 border-red-200" : diasVenc <= 7 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200";
                const PERIODO_LABEL: Record<string, string> = { DIARIO: "dia", SEMANAL: "semana", QUINZENAL: "quinzena", MENSAL: "mês" };
                return (
                  <Card key={m.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Wrench className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{m.nome}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{m.tipo}{m.marca ? ` • ${m.marca}` : ""}{m.modelo ? ` ${m.modelo}` : ""}</p>
                          </div>
                        </div>
                        <Badge variant={m.status === "PROPRIO" ? "secondary" : "info"} className="shrink-0">
                          {m.status === "PROPRIO" ? "Próprio" : "Locado"}
                        </Badge>
                      </div>
                      <div className="border-t border-[var(--border)] pt-3 space-y-2 text-xs">
                        {m.status === "LOCADO" && (
                          <>
                            {m.locadoraNome && <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Locadora</span><span className="font-medium">{m.locadoraNome}</span></div>}
                            {m.valorLocacao && (
                              <div className="flex justify-between">
                                <span className="text-[var(--muted-foreground)]">Valor locação</span>
                                <span className="font-semibold">{formatCurrency(m.valorLocacao)}/{m.periodicidadeLocacao ? PERIODO_LABEL[m.periodicidadeLocacao] || m.periodicidadeLocacao : "—"}</span>
                              </div>
                            )}
                            {m.dataVencimentoLocacao && (
                              <div className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 ${vencBg}`}>
                                <span className="text-[var(--muted-foreground)]">{formatDate(m.dataVencimentoLocacao)}</span>
                                {diasVenc !== null && (
                                  <span className={`font-semibold ${vencColor}`}>
                                    {diasVenc < 0 ? `Vencido há ${Math.abs(diasVenc)}d` : diasVenc === 0 ? "Vence hoje" : `Vence em ${diasVenc}d`}
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        {m.observacoes && <p className="text-[var(--muted-foreground)] italic pt-1 border-t border-[var(--border)]">{m.observacoes}</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ALERTAS */}
        <TabsContent value="alertas">
          <Card>
            <CardContent className="p-4 space-y-2">
              {obra.alertas.length === 0 ? (
                <p className="text-center py-8 text-emerald-600">Nenhum alerta pendente</p>
              ) : (
                obra.alertas.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{a.mensagem}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showEdit && (
        <ObraFormDialog
          open={showEdit}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); loadObra(); }}
          initialData={{
            id: obra.id, nome: obra.nome, endereco: obra.endereco,
            cidade: obra.cidade, estado: obra.estado, cep: obra.cep,
            responsavel: obra.responsavel, cliente: obra.cliente,
            dataInicio: obra.dataInicio.split("T")[0], dataPrevisaoFim: obra.dataPrevisaoFim.split("T")[0],
            status: obra.status as "PLANEJAMENTO" | "EM_ANDAMENTO" | "PARALISADA" | "CONCLUIDA",
            descricao: obra.descricao || undefined,
          }}
        />
      )}

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Esta ação irá excluir permanentemente a obra <strong>{obra.nome}</strong> e todos os dados relacionados. Não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Excluir Obra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Etapa form */}
      <EtapaFormDialog
        open={showEtapaForm}
        onClose={() => { setShowEtapaForm(false); setEditingEtapa(null); }}
        onSuccess={() => { setShowEtapaForm(false); setEditingEtapa(null); loadEtapas(); }}
        obraId={obra.id}
        initialData={editingEtapa ? {
          id: editingEtapa.id, nome: editingEtapa.nome, ordem: editingEtapa.ordem,
          status: editingEtapa.status as "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "PARALISADA",
          percentual: editingEtapa.percentual,
          descricao: editingEtapa.descricao || undefined,
          observacoes: editingEtapa.observacoes || undefined,
          dataInicioPrev: editingEtapa.dataInicioPrev?.split("T")[0],
          dataFimPrev: editingEtapa.dataFimPrev?.split("T")[0],
          dataInicioReal: editingEtapa.dataInicioReal?.split("T")[0],
          dataFimReal: editingEtapa.dataFimReal?.split("T")[0],
          valorPrevisto: editingEtapa.valorPrevisto || undefined,
        } : undefined}
        nextOrdem={etapas.length}
      />

      <Dialog open={!!showDeleteEtapa} onOpenChange={(v) => !v && setShowDeleteEtapa(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover etapa</DialogTitle>
            <DialogDescription>Deseja remover a etapa <strong>{showDeleteEtapa?.nome}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteEtapa(null)} disabled={deletingEtapa}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteEtapa} disabled={deletingEtapa}>
              {deletingEtapa && <Loader2 className="w-4 h-4 animate-spin" />} Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estoque forms */}
      <ItemEstoqueFormDialog
        open={showItemForm}
        onClose={() => { setShowItemForm(false); setEditingItem(null); }}
        onSuccess={() => { setShowItemForm(false); setEditingItem(null); loadEstoque(); }}
        obraId={obra.id}
        initialData={editingItem ? {
          id: editingItem.id, nome: editingItem.nome, unidade: editingItem.unidade,
          categoria: editingItem.categoria || undefined,
          quantidadeMinima: editingItem.quantidadeMinima || undefined,
          valorUnitario: editingItem.valorUnitario || undefined,
        } : undefined}
      />

      {showMovForm && (
        <MovimentacaoFormDialog
          open
          onClose={() => setShowMovForm(null)}
          onSuccess={() => { setShowMovForm(null); loadEstoque(); }}
          itemId={showMovForm.id}
          itemNome={showMovForm.nome}
          unidade={showMovForm.unidade}
          saldoAtual={Number(showMovForm.quantidadeAtual)}
        />
      )}

      <Dialog open={!!showDeleteItem} onOpenChange={(v) => !v && setShowDeleteItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover material</DialogTitle>
            <DialogDescription>Deseja remover <strong>{showDeleteItem?.nome}</strong> do estoque? Todo o histórico de movimentações será perdido.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteItem(null)} disabled={deletingItem}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteItem} disabled={deletingItem}>
              {deletingItem && <Loader2 className="w-4 h-4 animate-spin" />} Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
