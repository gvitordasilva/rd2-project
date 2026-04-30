"use client";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, AlertTriangle, Wrench, Users, Building2, DollarSign, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { formatRelativeDate, ALERTA_TIPO_LABELS, ALERTA_TIPO_COLORS } from "@/lib/utils";

interface Alerta {
  id: string;
  tipo: string;
  mensagem: string;
  lido: boolean;
  createdAt: string;
  dataExpiracao: string | null;
  obra: { nome: string };
  obraId: string;
}

const TIPO_ICONS: Record<string, React.ElementType> = {
  VENCIMENTO_LOCACAO: Wrench,
  PAGAMENTO_FUNCIONARIO: Users,
  PRAZO_OBRA: Building2,
  DESPESA_PENDENTE: DollarSign,
};

export default function AlertasPage() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [totalNaoLidos, setTotalNaoLidos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [tipoFilter, setTipoFilter] = useState("");
  const [lidoFilter, setLidoFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { data: Alerta[]; totalNaoLidos: number } }>("/api/alertas", {
        params: {
          tipo: tipoFilter || undefined,
          lido: lidoFilter !== "" ? lidoFilter : undefined,
        },
      });
      setAlertas(res.data.data);
      setTotalNaoLidos(res.data.totalNaoLidos);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tipoFilter, lidoFilter]);

  const marcarLido = async (id: string) => {
    try {
      await apiFetch(`/api/alertas/${id}`, { method: "PATCH" });
      setAlertas((prev) => prev.map((a) => a.id === id ? { ...a, lido: true } : a));
      setTotalNaoLidos((prev) => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const marcarTodosLidos = async () => {
    const naoLidos = alertas.filter((a) => !a.lido);
    await Promise.all(naoLidos.map((a) => apiFetch(`/api/alertas/${a.id}`, { method: "PATCH" })));
    setAlertas((prev) => prev.map((a) => ({ ...a, lido: true })));
    setTotalNaoLidos(0);
    toast({ title: "Todos os alertas marcados como lidos", variant: "success" });
  };

  const gerarAlertas = async () => {
    setGerando(true);
    try {
      await apiFetch("/api/alertas/gerar", { method: "POST" });
      toast({ title: "Alertas gerados com sucesso!", variant: "success" });
      load();
    } catch (err) {
      toast({ title: "Erro ao gerar alertas", description: (err as Error).message, variant: "error" });
    } finally {
      setGerando(false);
    }
  };

  const alertasPorTipo = alertas.reduce((acc, a) => {
    acc[a.tipo] = (acc[a.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          {totalNaoLidos > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-700">{totalNaoLidos} alerta{totalNaoLidos !== 1 ? "s" : ""} não lido{totalNaoLidos !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {totalNaoLidos > 0 && (
            <Button variant="outline" onClick={marcarTodosLidos}>
              <CheckCheck className="w-4 h-4" /> Marcar todos como lidos
            </Button>
          )}
          <Button variant="outline" onClick={gerarAlertas} disabled={gerando}>
            {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Verificar agora
          </Button>
        </div>
      </div>

      {/* Resumo por tipo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(ALERTA_TIPO_LABELS).map(([tipo, label]) => {
          const Icon = TIPO_ICONS[tipo] || Bell;
          const count = alertasPorTipo[tipo] || 0;
          return (
            <Card key={tipo} className={`cursor-pointer transition-all ${tipoFilter === tipo ? "ring-2 ring-[var(--primary)]" : ""}`}
              onClick={() => setTipoFilter(tipoFilter === tipo ? "" : tipo)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ALERTA_TIPO_COLORS[tipo]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs text-[var(--muted-foreground)] leading-tight">{label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <Select value={lidoFilter || "all"} onValueChange={(v) => setLidoFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos alertas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos alertas</SelectItem>
            <SelectItem value="false">Não lidos</SelectItem>
            <SelectItem value="true">Lidos</SelectItem>
          </SelectContent>
        </Select>
        {tipoFilter && (
          <Button variant="outline" onClick={() => setTipoFilter("")}>
            Limpar filtro
          </Button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-[var(--secondary)] animate-pulse" />)}</div>
      ) : alertas.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 mx-auto text-emerald-400 mb-4" />
          <p className="text-[var(--muted-foreground)] font-medium">Nenhum alerta encontrado</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Tudo em ordem! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((alerta) => {
            const Icon = TIPO_ICONS[alerta.tipo] || Bell;
            return (
              <div
                key={alerta.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                  alerta.lido ? "border-[var(--border)] bg-[var(--card)] opacity-60" : "border-orange-200 bg-orange-50"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${ALERTA_TIPO_COLORS[alerta.tipo]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-medium ${alerta.lido ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)]"}`}>
                        {alerta.mensagem}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--muted-foreground)]">{alerta.obra.nome}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">·</span>
                        <span className="text-xs text-[var(--muted-foreground)]">{formatRelativeDate(alerta.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={ALERTA_TIPO_COLORS[alerta.tipo]} variant="outline">
                        <span className="text-[10px]">{ALERTA_TIPO_LABELS[alerta.tipo]}</span>
                      </Badge>
                      {!alerta.lido && (
                        <Button size="sm" variant="ghost" onClick={() => marcarLido(alerta.id)} className="h-7 px-2">
                          <CheckCheck className="w-3.5 h-3.5 mr-1" />
                          <span className="text-xs">Lido</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
