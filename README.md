# Luminar — Dashboard Financeiro · A&J Alpha Company

Dashboard financeiro web para controle diário de uma operação de tráfego pago
(anúncios Facebook/Instagram). Consolida **faturamento, vendas, leads, gasto com
anúncios e lucro** com integração à **Marketing API do Facebook** (gasto) e a um
**webhook da plataforma de vendas** (vendas e leads).

> **Status atual:** frontend completo e funcional com **dados de exemplo (mock)**.
> O backend (Prisma + webhook + sync da Meta) já está scaffoldado e pronto para
> ser conectado às credenciais reais. Veja [Próximos passos](#próximos-passos).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + TypeScript |
| Estilização | Tailwind CSS (dark mode padrão) |
| Gráficos | Recharts |
| Ícones | lucide-react |
| Backend | Node.js + Express |
| Banco | PostgreSQL + Prisma (ORM) |
| Agendamento | node-cron |

---

## Estrutura de pastas

```
DASH HIARLON/
├── frontend/                 # App React (Vite)
│   ├── src/
│   │   ├── components/       # layout, ui, dashboard (cards, charts)
│   │   ├── context/          # AuthContext, SettingsContext
│   │   ├── data/             # mock.ts (dados de exemplo) + metrics.ts (cálculos)
│   │   ├── lib/              # format.ts (R$, datas pt-BR), utils.ts
│   │   ├── pages/            # Dashboard, DadosDiarios, Gastos, Criativos, Spy, Chips, Config, Login
│   │   ├── types.ts
│   │   ├── App.tsx           # rotas
│   │   └── main.tsx          # providers + router
│   └── tailwind.config.js
│
└── backend/                  # API Express + Prisma
    ├── prisma/schema.prisma  # modelo de dados
    ├── src/
    │   ├── server.ts         # bootstrap Express
    │   ├── db.ts             # PrismaClient
    │   ├── routes/webhook.ts # POST /webhook/vendas (assinatura + idempotência)
    │   ├── services/facebook.ts  # Graph API: gasto por dia
    │   └── jobs/syncFacebook.ts  # cron a cada 15 min
    └── .env.example
```

---

## Como rodar localmente

### Pré-requisitos
- Node.js 18+ (testado em 24)
- PostgreSQL 14+ (apenas para o backend)

### 1. Frontend (funciona sozinho, com mock)

```bash
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:5173**.

**Login de demonstração:** `admin@aj-alpha.com` / senha `admin`
(autenticação mock no `AuthContext`; trocar pela do backend em produção).

### 2. Backend + banco no Supabase

**a) Criar o banco no Supabase**
1. Crie um projeto em [supabase.com](https://supabase.com) (anote a senha do banco).
2. Vá em **Project Settings → Database → Connection string**.
3. Copie a string do **Transaction pooler** (porta 6543) → `DATABASE_URL`.
4. Copie a string do **Session pooler / Direct** (porta 5432) → `DIRECT_URL`.

**b) Rodar o backend**
```bash
cd backend
npm install
cp .env.example .env        # cole DATABASE_URL, DIRECT_URL e gere o SALES_WEBHOOK_SECRET
npm run prisma:push         # cria as tabelas no Supabase (a partir do schema)
npm run dev                 # sobe a API em http://localhost:3333
```

> Gere o segredo do webhook com `openssl rand -hex 24` (ou qualquer string longa
> e aleatória) e use o mesmo valor na URL configurada na Payt/Luminar Pay.

---

## Variáveis de ambiente (backend/.env)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Conexão *pooled* do Supabase (porta **6543**) — usada pela app |
| `DIRECT_URL` | Conexão direta do Supabase (porta **5432**) — usada nas migrations |
| `PORT` | Porta da API (padrão 3333) |
| `FRONTEND_ORIGIN` | Origem liberada no CORS (ex.: `http://localhost:5173`) |
| `FB_ACCESS_TOKEN` | **System User Access Token** de longa duração da Meta |
| `FB_AD_ACCOUNT_ID` | ID da conta de anúncios, com prefixo `act_` |
| `FB_GRAPH_VERSION` | Versão da Graph API (ex.: `v21.0`) |
| `FB_ACCOUNT_TIMEZONE` | Fuso da conta de anúncios (`America/Sao_Paulo`) |
| `SALES_WEBHOOK_SECRET` | Segredo p/ validar a assinatura HMAC do webhook |

> 🔒 **Nunca** coloque tokens/segredos no código ou no frontend. Eles vivem só no
> `.env` do backend (que está no `.gitignore`).

---

## Integrações

### Marketing API do Facebook (gasto com anúncios)
- `backend/src/services/facebook.ts` chama `act_<ID>/insights` com
  `fields=spend&time_increment=1` para obter o gasto **por dia**.
- `backend/src/jobs/syncFacebook.ts` roda via **cron a cada 15 min**, busca os
  últimos 3 dias (cobre ajustes retroativos) e faz `upsert` em `daily_metrics`.
- Trata **paginação** e **erros de token** (ex.: código 190 = expirado).
- **[AJUSTAR]** confirme `FB_AD_ACCOUNT_ID`, versão da Graph API e filtros por
  campanha, se necessário.

### Webhook de vendas — Payt e Luminar Pay (formato "Payt postback")
- `POST /webhook/vendas/<SALES_WEBHOOK_SECRET>` em `backend/src/routes/webhook.ts`.
- **As duas plataformas usam o mesmo formato** (Payt postback), então um único
  endpoint atende ambas. Cada venda é marcada com o `gateway` (`payt` ou
  `luminar-pay`, detectado pelo `integration_key`).
- Nenhuma envia assinatura por header — a segurança é a **URL secreta**. O token
  é validado em tempo constante (path, `?token=` ou header `x-webhook-token`).
- Dispara **uma vez por pedido** quando o status vira `paid`. Eventos com
  `test: true` ou status diferente de `paid` são ignorados.
- `transaction.total_price` vem **em centavos** → dividido por 100.
- **Idempotente** via `transaction_id` (reenvio não duplica). Responde **200**.
- Campos gravados: valor, data/hora (`paid_at`, alimenta o gráfico por horário),
  origem (`link.url`) e gateway.
- **Observação:** este webhook traz apenas **vendas pagas**. Leads (ex.: do
  WhatsApp/CRM) precisam de outra fonte — o modelo `Lead` já existe no schema.

**Configurar nas plataformas:** em **Payt** e em **Luminar Pay**, aponte o
postback/webhook para a mesma URL:
`https://SEU_DOMINIO/webhook/vendas/<SALES_WEBHOOK_SECRET>`

**Testar localmente** (com o backend rodando em `npm run dev`):

```powershell
# PowerShell (Windows) — usa o exemplo real em backend/examples
$body = Get-Content backend/examples/payt-postback.json -Raw
Invoke-RestMethod -Method Post -ContentType 'application/json' `
  -Uri 'http://localhost:3333/webhook/vendas/SEU_TOKEN' -Body $body
```

```bash
# curl (bash)
curl -X POST http://localhost:3333/webhook/vendas/SEU_TOKEN \
  -H 'Content-Type: application/json' \
  --data @backend/examples/payt-postback.json
```

Troque `SEU_TOKEN` pelo valor de `SALES_WEBHOOK_SECRET`. A resposta deve ser
`{ "ok": true }` e a venda aparece no banco (`npm run prisma:studio`).

---

## Métricas do Dashboard

Todas respeitam o **seletor de período** (Hoje / Ontem / 7 dias / Este mês /
Personalizado) e tratam divisão por zero:

- Faturamento Total, Gasto com Anúncios, **Lucro Líquido** (verde/vermelho)
- Total de Vendas, Ticket Médio, **ROAS** (vermelho se gasto = 0 ou ROAS < 1)
- Leads Atendidos, Leads por Venda, Taxa de Conversão, CPA Médio
- **Imposto Meta Ads** (alíquota padrão **12,15%**, com toggle Ativo/Inativo)
- Investimento Total (Anúncios + Imposto)

Valores em **Real (R$, vírgula decimal)**; datas/fuso em **America/Sao_Paulo**.

---

## Deploy (produção)

Arquitetura: **frontend no Vercel**, **backend no Render**, **banco no Supabase**.

### 1. Banco — Supabase
Crie o projeto e pegue `DATABASE_URL` (pooler 6543) e `DIRECT_URL` (5432).

### 2. Backend — Render
1. Suba o código no GitHub.
2. Em [render.com](https://render.com): **New → Blueprint** e aponte para o repo
   (ele lê o `backend/render.yaml`).
3. Preencha as variáveis no painel: `DATABASE_URL`, `DIRECT_URL`,
   `SALES_WEBHOOK_SECRET`, `FRONTEND_ORIGIN` (a URL do Vercel), e as da Meta.
4. O deploy roda `prisma db push` (cria as tabelas) e sobe a API.
   Anote a URL gerada, ex.: `https://aj-alpha-api.onrender.com`.

### 3. Frontend — Vercel
1. Em [vercel.com/new](https://vercel.com/new), importe o mesmo repo.
2. **Root Directory:** `frontend`. Framework: Vite (auto).
3. Em **Environment Variables**, adicione `VITE_API_URL` = a URL do Render.
4. Deploy → você recebe a URL pública do dashboard.

> Sem `VITE_API_URL`, o frontend roda em **modo demo (mock)** — ótimo para
> publicar e visualizar antes do backend existir.

### 4. Ligar as pontas
- Configure na **Payt** e na **Luminar Pay** o webhook:
  `https://SUA_API/webhook/vendas/<SALES_WEBHOOK_SECRET>`
- Preencha o token e o `act_` da **Meta** para ativar o cron de gasto.

---

## Próximos passos

1. ✅ Frontend ligado ao backend (`VITE_API_URL`) com fallback para mock.
2. Implementar `POST /auth/login` com hash de senha e trocar o `AuthContext` mock.
3. Preencher as credenciais reais da Meta e validar o cron de sync.
4. Ligar também as páginas Dados Diários / Gastos / Criativos à API (hoje usam mock local).
