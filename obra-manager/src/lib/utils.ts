import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDatetime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatRelativeDate(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const STATUS_OBRA_LABELS: Record<string, string> = {
  PLANEJAMENTO: "Planejamento",
  EM_ANDAMENTO: "Em Andamento",
  PARALISADA: "Paralisada",
  CONCLUIDA: "Concluída",
};

export const STATUS_OBRA_COLORS: Record<string, string> = {
  PLANEJAMENTO: "bg-blue-100 text-blue-700",
  EM_ANDAMENTO: "bg-green-100 text-green-700",
  PARALISADA: "bg-yellow-100 text-yellow-700",
  CONCLUIDA: "bg-gray-100 text-gray-700",
};

export const TIPO_FUNC_LABELS: Record<string, string> = {
  CLT: "CLT",
  PJ: "PJ",
  DIARIA: "Diária",
  EMPREITEIRO: "Empreiteiro",
};

export const PERIODICIDADE_LABELS: Record<string, string> = {
  DIARIO: "Diário",
  SEMANAL: "Semanal",
  QUINZENAL: "Quinzenal",
  MENSAL: "Mensal",
};

export const ALERTA_TIPO_LABELS: Record<string, string> = {
  VENCIMENTO_LOCACAO: "Vencimento de Locação",
  PAGAMENTO_FUNCIONARIO: "Pagamento de Funcionário",
  PRAZO_OBRA: "Prazo de Obra",
  DESPESA_PENDENTE: "Despesa Pendente",
};

export const ALERTA_TIPO_COLORS: Record<string, string> = {
  VENCIMENTO_LOCACAO: "bg-orange-100 text-orange-700",
  PAGAMENTO_FUNCIONARIO: "bg-blue-100 text-blue-700",
  PRAZO_OBRA: "bg-red-100 text-red-700",
  DESPESA_PENDENTE: "bg-yellow-100 text-yellow-700",
};
