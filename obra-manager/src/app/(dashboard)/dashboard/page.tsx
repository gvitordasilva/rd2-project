"use client";
import { useEffect, useState } from "react";
import { Building2, Users, DollarSign, Bell, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { formatCurrency, formatRelativeDate, ALERTA_TIPO_LABELS, ALERTA_TIPO_COLORS, STATUS_OBRA_LABELS } from "@/lib/utils";

const STATUS_COLORS = ["#1d4ed8", "#22c55e", "#f59e0b", "#6b7280"];

interface DashboardData {
  totalObrasAtivas: number;
  totalFuncionarios: number;
  saldoConsolidado: number;
  alertasPendentes: number;
  obrasPorStatus: { status: string; count: number }[];
  fluxoMensal: { mes: string; entradas: number; saidas: number }[];
  top5ObrasPorGasto: { id: string; nome: string; totalGasto: number }[];
  alertasRecentes: { id: string; tipo: string; mensagem: string; createdAt: string; obra: { nome: string } }[];
}

function StatCard({ title, value, icon: Icon, change, color }: {
  title: string; value: string; icon: React.ElementType; change?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">{title}</p>
            <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
            {change && <p className="text-xs text-[var(--muted-foreground)] mt-1">{change}</p>}
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { apiFetch } = useApi();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: DashboardData }>("/api/dashboard")
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-[var(--secondary)] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-72 rounded-lg bg-[var(--secondary)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-center py-20 text-[var(--muted-foreground)]">Erro ao carregar dashboard</div>;

  const pieData = data.obrasPorStatus.map((o) => ({
    name: STATUS_OBRA_LABELS[o.status] || o.status,
    value: o.count,
  }));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Obras Ativas" value={String(data.totalObrasAtivas)} icon={Building2} color="bg-blue-600" change="Em andamento e planejamento" />
        <StatCard title="Funcionários Ativos" value={String(data.totalFuncionarios)} icon={Users} color="bg-emerald-600" />
        <StatCard
          title="Saldo Consolidado"
          value={formatCurrency(data.saldoConsolidado)}
          icon={data.saldoConsolidado >= 0 ? TrendingUp : TrendingDown}
          color={data.saldoConsolidado >= 0 ? "bg-emerald-600" : "bg-red-500"}
          change="Todas as obras"
        />
        <StatCard
          title="Alertas Pendentes"
          value={String(data.alertasPendentes)}
          icon={Bell}
          color={data.alertasPendentes > 0 ? "bg-orange-500" : "bg-slate-500"}
          change={data.alertasPendentes > 0 ? "Requerem atenção" : "Tudo em dia"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fluxo Financeiro */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Fluxo Financeiro — Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.fluxoMensal} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  labelStyle={{ fontWeight: "bold" }}
                  contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
                />
                <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Obras por Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Obras por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-[var(--muted-foreground)] text-sm">
                Nenhuma obra cadastrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Obras por gasto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Obras por Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.top5ObrasPorGasto.length === 0 && (
                <p className="text-[var(--muted-foreground)] text-sm text-center py-4">Sem dados</p>
              )}
              {data.top5ObrasPorGasto.map((obra, i) => (
                <div key={obra.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{obra.nome}</p>
                    <div className="w-full bg-[var(--secondary)] rounded-full h-1.5 mt-1">
                      <div
                        className="bg-[var(--primary)] h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (obra.totalGasto / (data.top5ObrasPorGasto[0]?.totalGasto || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{formatCurrency(obra.totalGasto)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alertas recentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Alertas Recentes</CardTitle>
              {data.alertasPendentes > 0 && (
                <Badge variant="destructive">{data.alertasPendentes} pendentes</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.alertasRecentes.length === 0 && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm py-4 justify-center">
                  <Bell className="w-4 h-4" />
                  Nenhum alerta pendente
                </div>
              )}
              {data.alertasRecentes.map((alerta) => (
                <div key={alerta.id} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--secondary)]">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{alerta.mensagem}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">{alerta.obra.nome} · {formatRelativeDate(alerta.createdAt)}</p>
                  </div>
                  <Badge className={ALERTA_TIPO_COLORS[alerta.tipo]} variant="outline">
                    <span className="text-[10px]">{ALERTA_TIPO_LABELS[alerta.tipo]?.split(" ")[0]}</span>
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
