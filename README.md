# Obra Manager — Sistema de Gerenciamento de Obras

Sistema web completo para gerenciamento de obras civis. Controle financeiro, funcionários, maquinário e alertas automáticos.

## Stack

- **Frontend/Backend**: Next.js 16 (App Router) + TypeScript
- **Banco de dados**: PostgreSQL + Prisma ORM
- **Autenticação**: JWT (access + refresh tokens)
- **UI**: Tailwind CSS + Radix UI + Recharts
- **Infra**: Docker + docker-compose

## Início Rápido

### 1. Pré-requisitos

- Node.js 20+
- Docker e docker-compose

### 2. Subir banco de dados

```bash
# Na raiz do projeto
docker-compose up postgres -d
```

### 3. Instalar e configurar

```bash
cd obra-manager

# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env

# Gerar cliente Prisma + criar tabelas + seeds
npm run setup
```

### 4. Iniciar aplicação

```bash
npm run dev
```

Acesse: **http://localhost:3000**

## Credenciais de Demonstração

| Perfil   | Email                        | Senha       |
|----------|------------------------------|-------------|
| Admin    | admin@obramanager.com        | admin123    |
| Gerente  | gerente@obramanager.com      | gerente123  |

## Variáveis de Ambiente

Arquivo `.env` na pasta `obra-manager/`:

| Variável              | Descrição                                 |
|-----------------------|-------------------------------------------|
| `DATABASE_URL`        | URL de conexão PostgreSQL                 |
| `JWT_SECRET`          | Chave secreta para access tokens          |
| `JWT_REFRESH_SECRET`  | Chave secreta para refresh tokens         |
| `JWT_EXPIRES_IN`      | Expiração do access token (ex: `15m`)     |
| `JWT_REFRESH_EXPIRES_IN` | Expiração do refresh token (ex: `7d`) |
| `UPLOAD_DIR`          | Pasta para uploads (padrão: `./uploads`)  |
| `MAX_FILE_SIZE`       | Tamanho máximo de upload em bytes         |
| `SMTP_*`              | Configurações de e-mail (opcional)        |

## Módulos

1. **Dashboard** — Visão geral com KPIs e gráficos consolidados
2. **Obras** — CRUD completo com busca por CEP (ViaCEP)
3. **Funcionários** — Cadastro, pagamentos e histórico
4. **Maquinário** — Equipamentos próprios e locados com alertas de vencimento
5. **Financeiro** — Entradas, saídas, gráficos de fluxo de caixa
6. **Alertas** — Central de notificações com cron job diário
7. **Documentos** — Gestão de arquivos por obra

## Perfis de Acesso

| Módulo      | Admin | Gerente | Financeiro | Visualizador |
|-------------|-------|---------|------------|--------------|
| Obras       | ✅ CRUD | ✅ RW  | ✅ R       | ✅ R         |
| Funcionários| ✅ CRUD | ✅ RW  | ✅ R       | ✅ R         |
| Financeiro  | ✅ CRUD | ✅ RW  | ✅ CRUD    | ✅ R         |
| Maquinário  | ✅ CRUD | ✅ RW  | ✅ R       | ✅ R         |
| Usuários    | ✅     | ❌      | ❌         | ❌           |

## Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run db:migrate   # Criar migration
npm run db:push      # Sincronizar schema (sem migration)
npm run db:seed      # Popular banco com dados de demonstração
npm run db:studio    # Abrir Prisma Studio
npm run db:reset     # Resetar banco e re-seed
npm run setup        # db:push + db:seed
```

## Deploy com Docker

```bash
# Na raiz do projeto
docker-compose up -d
```

Isso sobe o PostgreSQL + a aplicação Next.js em produção.
