import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  orgSlug: z.string().optional(),
});

export const organizationSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  slug: z.string().min(2, "Código deve ter no mínimo 2 caracteres").regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
  ativo: z.boolean().optional(),
});

export const createOrgUserSchema = z.object({
  nome: z.string().min(3, "Nome inválido"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  perfil: z.enum(["ADMIN", "GERENTE", "FINANCEIRO", "VISUALIZADOR"]),
});

export const obraSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  endereco: z.string().min(5, "Endereço inválido"),
  bairro: z.string().optional(),
  cidade: z.string().min(2, "Cidade inválida"),
  estado: z.string().length(2, "Estado deve ter 2 letras"),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  responsavel: z.string().min(3, "Nome do responsável inválido"),
  cliente: z.string().min(3, "Nome do cliente inválido"),
  dataInicio: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  dataPrevisaoFim: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  status: z.enum(["PLANEJAMENTO", "EM_ANDAMENTO", "PARALISADA", "CONCLUIDA"]).optional(),
  descricao: z.string().optional(),
  observacoes: z.string().optional(),
  orcamentoPrevisto: z.number().positive().optional(),
});

export const funcionarioSchema = z.object({
  nome: z.string().min(3, "Nome inválido"),
  cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, "CPF inválido"),
  cargo: z.string().min(2, "Cargo inválido"),
  tipo: z.enum(["CLT", "PJ", "DIARIA", "EMPREITEIRO"]),
  valorPagamento: z.number().positive("Valor deve ser positivo"),
  periodicidade: z.enum(["DIARIO", "SEMANAL", "QUINZENAL", "MENSAL"]),
  dadosBancarios: z.string().optional(),
  contato: z.string().optional(),
  dataAdmissao: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Data inválida"),
  status: z.enum(["ATIVO", "INATIVO", "AFASTADO"]).optional(),
  obraId: z.string().min(1, "Obra obrigatória"),
});

export const pagamentoSchema = z.object({
  funcionarioId: z.string().min(1),
  obraId: z.string().min(1),
  valor: z.number().positive("Valor deve ser positivo"),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Data inválida"),
  referencia: z.string().optional(),
});

export const maquinarioSchema = z.object({
  nome: z.string().min(2, "Nome inválido"),
  tipo: z.string().min(2, "Tipo inválido"),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  numeroSerie: z.string().optional(),
  status: z.enum(["PROPRIO", "LOCADO"]),
  locadoraNome: z.string().optional(),
  locadoraContato: z.string().optional(),
  dataInicioLocacao: z.string().optional(),
  dataVencimentoLocacao: z.string().optional(),
  valorLocacao: z.number().positive().optional(),
  periodicidadeLocacao: z.enum(["DIARIO", "SEMANAL", "QUINZENAL", "MENSAL"]).optional(),
  observacoes: z.string().optional(),
  obraId: z.string().min(1, "Obra obrigatória"),
});

export const transacaoSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  valor: z.number().positive("Valor deve ser positivo"),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Data inválida"),
  categoria: z.string().min(1, "Categoria obrigatória"),
  subcategoria: z.string().optional(),
  descricao: z.string().min(3, "Descrição obrigatória"),
  fornecedor: z.string().optional(),
  formaPagamento: z.string().optional(),
  status: z.enum(["PENDENTE", "PAGO", "CANCELADO"]).optional(),
  obraId: z.string().min(1, "Obra obrigatória"),
});
