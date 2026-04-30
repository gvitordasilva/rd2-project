export type { UserRole, ObraStatus, FuncionarioStatus, FuncionarioTipo, Periodicidade, MaquinarioStatus, TransacaoTipo, TransacaoStatus, AlertaTipo } from "@/generated/prisma";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown;
}

export interface AuthUser {
  userId: string;
  email: string;
  perfil: string;
  nome?: string;
}

export interface ObraWithStats {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  status: string;
  responsavel: string;
  cliente: string;
  dataInicio: string;
  dataPrevisaoFim: string;
  fotoPath: string | null;
  orcamentoPrevisto: number | null;
  _count: {
    funcionarios: number;
    maquinarios: number;
    transacoes: number;
  };
  saldoFinanceiro?: number;
  totalEntradas?: number;
  totalSaidas?: number;
}

export interface DashboardStats {
  totalObrasAtivas: number;
  totalFuncionarios: number;
  saldoConsolidado: number;
  alertasPendentes: number;
  obrasPorStatus: { status: string; count: number }[];
  fluxoMensal: { mes: string; entradas: number; saidas: number }[];
  top5ObrasPorGasto: { id: string; nome: string; totalGasto: number }[];
}

export interface AlertaWithObra {
  id: string;
  tipo: string;
  mensagem: string;
  obraId: string;
  entidadeId: string | null;
  entidadeTipo: string | null;
  lido: boolean;
  dataExpiracao: string | null;
  createdAt: string;
  obra: { nome: string };
}
