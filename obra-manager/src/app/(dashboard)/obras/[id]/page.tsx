"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import {
  Building2, MapPin, Calendar, Users, Wrench, DollarSign, Edit, Trash2,
  TrendingUp, TrendingDown, AlertTriangle, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { ObraFormDialog } from "@/components/forms/obra-form";
import { formatCurrency, formatDate, STATUS_OBRA_LABELS, STATUS_OBRA_COLORS } from "@/lib/utils";
import { differenceInDays } from "date-fns";

interface ObraDetalhe {
  id: string;
  nome: string;
  endereco: string;
  bairro: string | null;
  cidade: string;
  estado: string;
  cep: string;
  responsavel: string;
  cliente: string;
  dataInicio: string;
  dataPrevisaoFim: string;
  status: string;
  descricao: string | null;
  orcamentoPrevisto: number | null;
  fotoPath: string | null;
  totalEntradas: number;
  totalSaidas: number;
  saldoFinanceiro: number;
  _count: { funcionarios: number; maquinarios: number; transacoes: number; documentos: number };
  funcionarios: { id: string; nome: string; cargo: string; status: string }[];
  maquinarios: { id: string; nome: string; tipo: string; status: string; dataVencimentoLocacao: string | null }[];
  alertas: { id: string; tipo: string; mensagem: string; createdAt: string }[];
}

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

  const load = () => {
    setLoading(true);
    apiFetch<{ data: ObraDetalhe }>(`/api/obras/${params.id}`)
      .then((res) => setObra(res.data))
      .catch(() => toast({ title: "Obra não encontrada", variant: "error" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [params.id]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!obra) return <div className="text-center py-20">Obra não encontrada</div>;

  const diasRestantes = differenceInDays(new Date(obra.dataPrevisaoFim), new Date());

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
        <TabsList className="flex gap-1 border-b border-[var(--border)] pb-0 mb-6">
          {["info", "funcionarios", "maquinarios", "alertas"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] border-b-2 border-transparent data-[state=active]:border-[var(--primary)] data-[state=active]:text-[var(--primary)] transition-colors capitalize"
            >
              {tab === "info" ? "Informações" : tab === "funcionarios" ? `Funcionários (${obra._count.funcionarios})` : tab === "maquinarios" ? `Maquinário (${obra._count.maquinarios})` : `Alertas (${obra.alertas.length})`}
            </TabsTrigger>
          ))}
        </TabsList>

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

        <TabsContent value="funcionarios">
          <Card>
            <CardContent className="p-4 space-y-2">
              {obra.funcionarios.length === 0 ? (
                <p className="text-center py-8 text-[var(--muted-foreground)]">Nenhum funcionário ativo</p>
              ) : (
                obra.funcionarios.map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold">{f.nome.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-medium">{f.nome}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{f.cargo}</p>
                      </div>
                    </div>
                    <Badge variant={f.status === "ATIVO" ? "success" : "secondary"}>{f.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maquinarios">
          <Card>
            <CardContent className="p-4 space-y-2">
              {obra.maquinarios.length === 0 ? (
                <p className="text-center py-8 text-[var(--muted-foreground)]">Nenhum equipamento</p>
              ) : (
                obra.maquinarios.map((m) => {
                  const diasVenc = m.dataVencimentoLocacao ? differenceInDays(new Date(m.dataVencimentoLocacao), new Date()) : null;
                  return (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                      <div className="flex items-center gap-3">
                        <Wrench className="w-5 h-5 text-[var(--muted-foreground)]" />
                        <div>
                          <p className="text-sm font-medium">{m.nome}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{m.tipo}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {diasVenc !== null && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diasVenc < 3 ? "bg-red-100 text-red-700" : diasVenc < 7 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                            {diasVenc < 0 ? "Vencido" : `Vence em ${diasVenc}d`}
                          </span>
                        )}
                        <Badge variant={m.status === "PROPRIO" ? "secondary" : "info"}>
                          {m.status === "PROPRIO" ? "Próprio" : "Locado"}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

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

      {showEdit && (
        <ObraFormDialog
          open={showEdit}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); load(); }}
          initialData={{
            id: obra.id,
            nome: obra.nome,
            endereco: obra.endereco,
            cidade: obra.cidade,
            estado: obra.estado,
            cep: obra.cep,
            responsavel: obra.responsavel,
            cliente: obra.cliente,
            dataInicio: obra.dataInicio.split("T")[0],
            dataPrevisaoFim: obra.dataPrevisaoFim.split("T")[0],
            status: obra.status as FormData["status"],
            descricao: obra.descricao || undefined,
          }}
        />
      )}

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Esta ação irá excluir permanentemente a obra <strong>{obra.nome}</strong> e todos os seus dados relacionados (funcionários, transações, maquinário). Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Excluir Obra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type FormData = {
  status: "PLANEJAMENTO" | "EM_ANDAMENTO" | "PARALISADA" | "CONCLUIDA";
};
