import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { successResponse } from "@/lib/api-response";

// Categorias padrão de construção civil
const CATEGORIAS_ENTRADA = [
  "Aporte de Capital",
  "Recebimento de Cliente",
  "Financiamento Bancário",
  "Venda de Material",
  "Outros Recebimentos",
];

const CATEGORIAS_SAIDA = [
  "Material de Construção",
  "Mão de Obra",
  "Aluguel de Equipamento",
  "Serviços Terceirizados",
  "Impostos e Taxas",
  "Alimentação",
  "Transporte e Combustível",
  "Ferramentas e EPI",
  "Administrativo",
  "Seguro",
  "Energia Elétrica",
  "Água e Saneamento",
  "Outros",
];

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "financeiro:read");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");

  if (tipo === "ENTRADA") return successResponse(CATEGORIAS_ENTRADA);
  if (tipo === "SAIDA") return successResponse(CATEGORIAS_SAIDA);

  return successResponse({ ENTRADA: CATEGORIAS_ENTRADA, SAIDA: CATEGORIAS_SAIDA });
}
