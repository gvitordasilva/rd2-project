import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { addDays, subDays, subMonths } from "date-fns";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed multi-tenant...");

  // Super Admin
  const superHash = await bcrypt.hash("super123", 12);
  await prisma.user.upsert({
    where: { email: "superadmin@obramanager.com" },
    update: {},
    create: {
      nome: "Super Admin",
      email: "superadmin@obramanager.com",
      senha: superHash,
      perfil: "SUPER_ADMIN",
      organizationId: null,
    },
  });

  console.log("✅ Super Admin criado");

  // Organizações
  const org1 = await prisma.organization.upsert({
    where: { slug: "construtech" },
    update: {},
    create: {
      nome: "Construtech SP",
      slug: "construtech",
      ativo: true,
    },
  });

  const org2 = await prisma.organization.upsert({
    where: { slug: "buildpro" },
    update: {},
    create: {
      nome: "BuildPro RJ",
      slug: "buildpro",
      ativo: true,
    },
  });

  console.log("✅ Organizações criadas");

  // Usuários — Org 1
  const adminHash1 = await bcrypt.hash("admin123", 12);
  const admin1 = await prisma.user.upsert({
    where: { email: "admin@construtech.com" },
    update: {},
    create: {
      nome: "Administrador Construtech",
      email: "admin@construtech.com",
      senha: adminHash1,
      perfil: "ADMIN",
      organizationId: org1.id,
    },
  });

  const gerenteHash1 = await bcrypt.hash("gerente123", 12);
  await prisma.user.upsert({
    where: { email: "gerente@construtech.com" },
    update: {},
    create: {
      nome: "Carlos Gerente",
      email: "gerente@construtech.com",
      senha: gerenteHash1,
      perfil: "GERENTE",
      organizationId: org1.id,
    },
  });

  // Usuários — Org 2
  const adminHash2 = await bcrypt.hash("gerente123", 12);
  const admin2 = await prisma.user.upsert({
    where: { email: "admin@buildpro.com" },
    update: {},
    create: {
      nome: "Administrador BuildPro",
      email: "admin@buildpro.com",
      senha: adminHash2,
      perfil: "ADMIN",
      organizationId: org2.id,
    },
  });

  console.log("✅ Usuários criados");

  // Obras — Org 1
  const obra1 = await prisma.obra.upsert({
    where: { id: "obra-1" },
    update: {},
    create: {
      id: "obra-1",
      nome: "Residencial Vila Verde",
      endereco: "Rua das Palmeiras, 500",
      bairro: "Jardim Primavera",
      cidade: "São Paulo",
      estado: "SP",
      cep: "04567-890",
      responsavel: "Eng. Roberto Alves",
      cliente: "Construtora RBP Ltda",
      dataInicio: subMonths(new Date(), 4),
      dataPrevisaoFim: addDays(new Date(), 60),
      status: "EM_ANDAMENTO",
      descricao: "Conjunto residencial com 24 apartamentos de 2 e 3 quartos",
      orcamentoPrevisto: 2500000,
      organizationId: org1.id,
      userId: admin1.id,
    },
  });

  const obra2 = await prisma.obra.upsert({
    where: { id: "obra-2" },
    update: {},
    create: {
      id: "obra-2",
      nome: "Galpão Industrial Armazém Norte",
      endereco: "Av. Industrial, 1200",
      bairro: "Distrito Industrial",
      cidade: "Guarulhos",
      estado: "SP",
      cep: "07251-000",
      responsavel: "Eng. Fernanda Costa",
      cliente: "Logística Express S.A.",
      dataInicio: subMonths(new Date(), 2),
      dataPrevisaoFim: addDays(new Date(), 120),
      status: "EM_ANDAMENTO",
      descricao: "Galpão logístico de 5.000m² com docas e escritório administrativo",
      orcamentoPrevisto: 1800000,
      organizationId: org1.id,
      userId: admin1.id,
    },
  });

  const obra3 = await prisma.obra.upsert({
    where: { id: "obra-3" },
    update: {},
    create: {
      id: "obra-3",
      nome: "Reforma Escola Municipal Monteiro Lobato",
      endereco: "Rua Dom Pedro II, 77",
      bairro: "Centro",
      cidade: "Mogi das Cruzes",
      estado: "SP",
      cep: "08710-500",
      responsavel: "Eng. Paulo Santana",
      cliente: "Prefeitura de Mogi das Cruzes",
      dataInicio: subMonths(new Date(), 1),
      dataPrevisaoFim: addDays(new Date(), 5),
      status: "PLANEJAMENTO",
      descricao: "Reforma completa das instalações elétricas e hidráulicas",
      orcamentoPrevisto: 320000,
      organizationId: org1.id,
      userId: admin1.id,
    },
  });

  // Obras — Org 2
  const obra4 = await prisma.obra.upsert({
    where: { id: "obra-4" },
    update: {},
    create: {
      id: "obra-4",
      nome: "Torre Empresarial Centro RJ",
      endereco: "Av. Rio Branco, 85",
      bairro: "Centro",
      cidade: "Rio de Janeiro",
      estado: "RJ",
      cep: "20040-004",
      responsavel: "Eng. Mariana Figueiredo",
      cliente: "Incorporadora Atlântica S.A.",
      dataInicio: subMonths(new Date(), 3),
      dataPrevisaoFim: addDays(new Date(), 180),
      status: "EM_ANDAMENTO",
      descricao: "Torre comercial de 15 andares com lajes corporativas",
      orcamentoPrevisto: 8500000,
      organizationId: org2.id,
      userId: admin2.id,
    },
  });

  console.log("✅ Obras criadas");

  // Funcionários — Org 1
  const funcionariosOrg1 = [
    { nome: "João Silva", cpf: "123.456.789-00", cargo: "Pedreiro", tipo: "CLT" as const, valor: 3200, periodicidade: "MENSAL" as const, obraId: obra1.id },
    { nome: "Maria Santos", cpf: "234.567.890-11", cargo: "Auxiliar de Obras", tipo: "DIARIA" as const, valor: 180, periodicidade: "DIARIO" as const, obraId: obra1.id },
    { nome: "Pedro Oliveira", cpf: "345.678.901-22", cargo: "Eletricista", tipo: "PJ" as const, valor: 4800, periodicidade: "MENSAL" as const, obraId: obra1.id },
    { nome: "Ana Lima", cpf: "456.789.012-33", cargo: "Encanador", tipo: "CLT" as const, valor: 3600, periodicidade: "MENSAL" as const, obraId: obra1.id },
    { nome: "Carlos Ferreira", cpf: "567.890.123-44", cargo: "Servente", tipo: "DIARIA" as const, valor: 150, periodicidade: "DIARIO" as const, obraId: obra2.id },
    { nome: "Roberto Mendes", cpf: "678.901.234-55", cargo: "Operador de Máquinas", tipo: "CLT" as const, valor: 4200, periodicidade: "MENSAL" as const, obraId: obra2.id },
    { nome: "Fernanda Rocha", cpf: "901.234.567-88", cargo: "Técnica em Edificações", tipo: "PJ" as const, valor: 6000, periodicidade: "MENSAL" as const, obraId: obra3.id },
    { nome: "Gustavo Almeida", cpf: "012.345.678-99", cargo: "Azulejista", tipo: "EMPREITEIRO" as const, valor: 5000, periodicidade: "QUINZENAL" as const, obraId: obra3.id },
  ];

  for (const f of funcionariosOrg1) {
    const func = await prisma.funcionario.create({
      data: {
        nome: f.nome, cpf: f.cpf, cargo: f.cargo, tipo: f.tipo,
        valorPagamento: f.valor, periodicidade: f.periodicidade,
        dataAdmissao: subMonths(new Date(), 2),
        status: "ATIVO",
        obraId: f.obraId,
        organizationId: org1.id,
      },
    });
    await prisma.pagamento.create({
      data: {
        funcionarioId: func.id,
        obraId: f.obraId,
        organizationId: org1.id,
        valor: f.valor,
        dataPagamento: subDays(new Date(), 5),
        referencia: "Pagamento referência último período",
      },
    });
  }

  // Funcionários — Org 2
  const funcionariosOrg2 = [
    { nome: "Lucas Andrade", cpf: "111.222.333-44", cargo: "Mestre de Obras", tipo: "CLT" as const, valor: 5500, periodicidade: "MENSAL" as const, obraId: obra4.id },
    { nome: "Beatriz Costa", cpf: "222.333.444-55", cargo: "Engenheira Civil", tipo: "PJ" as const, valor: 9000, periodicidade: "MENSAL" as const, obraId: obra4.id },
  ];

  for (const f of funcionariosOrg2) {
    const func = await prisma.funcionario.create({
      data: {
        nome: f.nome, cpf: f.cpf, cargo: f.cargo, tipo: f.tipo,
        valorPagamento: f.valor, periodicidade: f.periodicidade,
        dataAdmissao: subMonths(new Date(), 3),
        status: "ATIVO",
        obraId: f.obraId,
        organizationId: org2.id,
      },
    });
    await prisma.pagamento.create({
      data: {
        funcionarioId: func.id,
        obraId: f.obraId,
        organizationId: org2.id,
        valor: f.valor,
        dataPagamento: subDays(new Date(), 3),
        referencia: "Pagamento referência último período",
      },
    });
  }

  console.log("✅ Funcionários criados");

  // Maquinários — Org 1
  await prisma.maquinario.create({
    data: {
      nome: "Betoneira 400L", tipo: "Betoneira", marca: "CSM", modelo: "B400",
      status: "PROPRIO", observacoes: "Equipamento próprio em bom estado",
      obraId: obra1.id, organizationId: org1.id,
    },
  });

  await prisma.maquinario.create({
    data: {
      nome: "Escavadeira Hidráulica", tipo: "Escavadeira", marca: "Caterpillar", modelo: "320D",
      status: "LOCADO", locadoraNome: "Aluga Máquinas Ltda", locadoraContato: "(11) 3456-7890",
      dataInicioLocacao: subMonths(new Date(), 1), dataVencimentoLocacao: addDays(new Date(), 5),
      valorLocacao: 3500, periodicidadeLocacao: "MENSAL",
      obraId: obra2.id, organizationId: org1.id,
    },
  });

  await prisma.maquinario.create({
    data: {
      nome: "Compactador de Solo", tipo: "Compactador", marca: "Dynapac", modelo: "CC1300",
      status: "LOCADO", locadoraNome: "Aluga Máquinas Ltda", locadoraContato: "(11) 3456-7890",
      dataInicioLocacao: subMonths(new Date(), 1), dataVencimentoLocacao: addDays(new Date(), 14),
      valorLocacao: 1200, periodicidadeLocacao: "MENSAL",
      obraId: obra1.id, organizationId: org1.id,
    },
  });

  // Maquinários — Org 2
  await prisma.maquinario.create({
    data: {
      nome: "Guindaste Torre 50t", tipo: "Guindaste", marca: "Liebherr", modelo: "EC-B",
      status: "LOCADO", locadoraNome: "Gruas Brasil S.A.", locadoraContato: "(21) 9876-5432",
      dataInicioLocacao: subMonths(new Date(), 2), dataVencimentoLocacao: addDays(new Date(), 25),
      valorLocacao: 12000, periodicidadeLocacao: "MENSAL",
      obraId: obra4.id, organizationId: org2.id,
    },
  });

  console.log("✅ Maquinários criados");

  // Categorias financeiras — Org 1
  const categoriasOrg1 = [
    { nome: "Material de Construção", tipo: "SAIDA" as const },
    { nome: "Mão de Obra", tipo: "SAIDA" as const },
    { nome: "Aluguel de Equipamento", tipo: "SAIDA" as const },
    { nome: "Serviço Terceirizado", tipo: "SAIDA" as const },
    { nome: "Transporte", tipo: "SAIDA" as const },
    { nome: "Medição", tipo: "ENTRADA" as const },
    { nome: "Adiantamento", tipo: "ENTRADA" as const },
    { nome: "Outros", tipo: "ENTRADA" as const },
  ];

  for (const cat of categoriasOrg1) {
    await prisma.categoriaFinanceira.create({ data: { ...cat, organizationId: org1.id } });
  }

  // Categorias financeiras — Org 2
  const categoriasOrg2 = [
    { nome: "Material de Construção", tipo: "SAIDA" as const },
    { nome: "Mão de Obra Especializada", tipo: "SAIDA" as const },
    { nome: "Locação de Equipamento", tipo: "SAIDA" as const },
    { nome: "Medição de Obra", tipo: "ENTRADA" as const },
    { nome: "Financiamento Recebido", tipo: "ENTRADA" as const },
  ];

  for (const cat of categoriasOrg2) {
    await prisma.categoriaFinanceira.create({ data: { ...cat, organizationId: org2.id } });
  }

  // Transações — Org 1
  const transacoesOrg1 = [
    { tipo: "ENTRADA" as const, valor: 500000, data: subMonths(new Date(), 3), categoria: "Medição", descricao: "Medição #1 - fundações", status: "PAGO" as const, obraId: obra1.id },
    { tipo: "ENTRADA" as const, valor: 300000, data: subMonths(new Date(), 2), categoria: "Medição", descricao: "Medição #2 - estrutura", status: "PAGO" as const, obraId: obra1.id },
    { tipo: "ENTRADA" as const, valor: 150000, data: subMonths(new Date(), 1), categoria: "Adiantamento", descricao: "Adiantamento para materiais", status: "PAGO" as const, obraId: obra1.id },
    { tipo: "SAIDA" as const, valor: 85000, data: subMonths(new Date(), 3), categoria: "Material de Construção", descricao: "Aço CA-50 e CA-60", fornecedor: "Aços SP Ltda", status: "PAGO" as const, obraId: obra1.id },
    { tipo: "SAIDA" as const, valor: 42000, data: subMonths(new Date(), 2), categoria: "Material de Construção", descricao: "Cimento e areia", fornecedor: "Depósito Central", status: "PAGO" as const, obraId: obra1.id },
    { tipo: "SAIDA" as const, valor: 28000, data: subMonths(new Date(), 1), categoria: "Mão de Obra", descricao: "Pagamento equipe - março", status: "PAGO" as const, obraId: obra1.id },
    { tipo: "SAIDA" as const, valor: 3500, data: subDays(new Date(), 10), categoria: "Aluguel de Equipamento", descricao: "Aluguel compactador", fornecedor: "Aluga Máquinas Ltda", status: "PENDENTE" as const, obraId: obra1.id },
    { tipo: "ENTRADA" as const, valor: 400000, data: subMonths(new Date(), 1), categoria: "Medição", descricao: "Medição #1 - terraplanagem", status: "PAGO" as const, obraId: obra2.id },
    { tipo: "SAIDA" as const, valor: 65000, data: subMonths(new Date(), 1), categoria: "Material de Construção", descricao: "Vergalhões e chapas metálicas", fornecedor: "MetalPro SP", status: "PAGO" as const, obraId: obra2.id },
    { tipo: "SAIDA" as const, valor: 35000, data: subDays(new Date(), 5), categoria: "Mão de Obra", descricao: "Pagamento equipe - abril", status: "PENDENTE" as const, obraId: obra2.id },
    { tipo: "ENTRADA" as const, valor: 80000, data: subDays(new Date(), 3), categoria: "Adiantamento", descricao: "Adiantamento inicial - prefeitura", status: "PAGO" as const, obraId: obra3.id },
    { tipo: "SAIDA" as const, valor: 15000, data: subDays(new Date(), 2), categoria: "Material de Construção", descricao: "Materiais elétricos e hidráulicos", fornecedor: "Elétrica Total", status: "PENDENTE" as const, obraId: obra3.id },
  ];

  for (const t of transacoesOrg1) {
    await prisma.transacaoFinanceira.create({
      data: { ...t, data: t.data, userId: admin1.id, organizationId: org1.id },
    });
  }

  // Transações — Org 2
  const transacoesOrg2 = [
    { tipo: "ENTRADA" as const, valor: 2000000, data: subMonths(new Date(), 2), categoria: "Financiamento Recebido", descricao: "Liberação financiamento - parcela 1", status: "PAGO" as const, obraId: obra4.id },
    { tipo: "SAIDA" as const, valor: 350000, data: subMonths(new Date(), 2), categoria: "Material de Construção", descricao: "Estrutura metálica e concreto", fornecedor: "Estruturas RJ Ltda", status: "PAGO" as const, obraId: obra4.id },
    { tipo: "SAIDA" as const, valor: 120000, data: subDays(new Date(), 15), categoria: "Mão de Obra Especializada", descricao: "Equipe de montagem estrutural", status: "PAGO" as const, obraId: obra4.id },
    { tipo: "SAIDA" as const, valor: 12000, data: subDays(new Date(), 20), categoria: "Locação de Equipamento", descricao: "Aluguel guindaste torre - mês 2", status: "PENDENTE" as const, obraId: obra4.id },
  ];

  for (const t of transacoesOrg2) {
    await prisma.transacaoFinanceira.create({
      data: { ...t, data: t.data, userId: admin2.id, organizationId: org2.id },
    });
  }

  console.log("✅ Transações financeiras criadas");

  // Alertas — Org 1
  await prisma.alerta.createMany({
    data: [
      {
        tipo: "VENCIMENTO_LOCACAO",
        mensagem: 'Locação de "Escavadeira Hidráulica" vence em 5 dias',
        obraId: obra2.id,
        organizationId: org1.id,
        entidadeTipo: "MAQUINARIO",
        lido: false,
        dataExpiracao: addDays(new Date(), 6),
      },
      {
        tipo: "PRAZO_OBRA",
        mensagem: 'Obra "Reforma Escola Municipal" tem prazo em 5 dias',
        obraId: obra3.id,
        organizationId: org1.id,
        entidadeTipo: "OBRA",
        lido: false,
      },
      {
        tipo: "DESPESA_PENDENTE",
        mensagem: 'Despesa "Aluguel compactador" está pendente há mais de 7 dias',
        obraId: obra1.id,
        organizationId: org1.id,
        entidadeTipo: "TRANSACAO",
        lido: false,
      },
    ],
  });

  // Alertas — Org 2
  await prisma.alerta.createMany({
    data: [
      {
        tipo: "DESPESA_PENDENTE",
        mensagem: 'Despesa "Aluguel guindaste torre" está pendente',
        obraId: obra4.id,
        organizationId: org2.id,
        entidadeTipo: "TRANSACAO",
        lido: false,
      },
    ],
  });

  console.log("✅ Alertas criados");
  console.log("🎉 Seed multi-tenant concluído!");
  console.log("---");
  console.log("Acessos:");
  console.log("  Super Admin (sem org): superadmin@obramanager.com / super123");
  console.log("  Org [construtech] Admin: admin@construtech.com / admin123");
  console.log("  Org [construtech] Gerente: gerente@construtech.com / gerente123");
  console.log("  Org [buildpro] Admin: admin@buildpro.com / gerente123");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
