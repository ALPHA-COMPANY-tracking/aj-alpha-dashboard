# STATUS / Coordenação — A&J Alpha Dashboard

> Documento compartilhado para coordenar trabalho entre assistentes (Claude/Codex)
> e o dono do projeto. **Não colocar segredos/tokens reais aqui.**

## Arquitetura (produção)
- **Frontend:** Vite + React + Tailwind (tema **dourado**). Pasta `frontend/`.
- **Backend:** funções serverless do Vercel em `frontend/api/*` (NÃO usar a pasta
  legada `backend/`). Banco: **Supabase** (schema em `frontend/supabase-schema.sql`).
- **Deploy:** `git push origin main` → Vercel publica sozinho.
  Live: https://aj-alpha-dashboard.vercel.app
  Repo: github.com/ALPHA-COMPANY-tracking/aj-alpha-dashboard

## Webhook de vendas (Payt + Luminar Pay)
- Endpoint: `POST /api/webhook/vendas/<SALES_WEBHOOK_SECRET>` (mesma URL p/ as duas
  plataformas; gateway detectado por `integration_key`).
- **Status do secret:** o `SALES_WEBHOOK_SECRET` ativo no Vercel **bate** com o token
  que aparece na URL da tela de Configurações. Testado ao vivo: GET e POST → 200.
  O 401 antigo foi só desalinhamento temporário — **resolvido**.
- ⚠️ O valor em `.deploy-secrets.tmp` está **DESATUALIZADO** — não usar.
- `vendas.ts` responde 200 em GET/HEAD e em body vazio (passa no "Testar URL" da Payt).

## Em aberto (precisa do dono)
- **Produtor × Afiliado (Payt):** detecção ainda é heurística
  (`detectarPapel` + `PAYT_AFFILIATE_EMAILS` + campos de afiliado/comissão).
  Para finalizar com precisão, falta **1 postback REAL de venda como afiliado +
  1 como produtor** para confirmar o campo exato.
- Rodar no Supabase, se ainda não rodou:
  `alter table public.sales add column if not exists papel text default 'produtor';`

## Divisão de trabalho (evitar conflito)
- **Codex:** lógica de webhook/dados — `api/webhook/vendas.ts`, `api/_lib/*`,
  `api/meta-*.ts`, `api/daily.ts`, Meta multi-BM, detecção produtor/afiliado.
  (Tem ~14 arquivos com mudanças NÃO commitadas no working tree.)
- **Claude:** visual/layout — tema, cards do dashboard, telas (Configurações UI,
  Dados Diários layout). Não toca nos arquivos acima enquanto o Codex está neles.

## Feito recentemente (Claude)
- Tema dourado (paleta, fundo, gráficos).
- Dashboard: card "Investido Total" (junta imposto+investimento), cards
  "Payt" (produtor/afiliado) e "Luminar Pay"; removidos "Gasto com Anúncios",
  "Imposto", "Investimento" separados; removidas páginas Gastos/Criativos/Spy/Chips.
- Dados Diários ligado ao `/api/daily` (dados reais).
- Tela de Configurações (Plataformas de Vendas + Meta Ads/BMs).
