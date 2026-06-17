create extension if not exists "pgcrypto";

create table if not exists public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  data date unique not null,
  faturamento numeric(12,2) not null default 0,
  total_vendas integer not null default 0,
  leads integer not null default 0,
  gasto_anuncios numeric(12,2) not null default 0,
  imposto numeric(12,2) not null default 0,
  gastos_operacionais numeric(12,2) not null default 0,
  origem_anuncios text not null default 'sync',
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  valor numeric(12,2) not null,
  data_hora timestamptz not null,
  criativo_id text,
  origem text,
  gateway text default 'payt',
  tipo text not null default 'venda',
  dia_semana integer not null,
  hora integer not null,
  created_at timestamptz not null default now()
);

create index if not exists sales_data_hora_idx on public.sales (data_hora);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  data_hora timestamptz not null,
  origem text,
  created_at timestamptz not null default now()
);

create index if not exists leads_data_hora_idx on public.leads (data_hora);

create table if not exists public.operational_expenses (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric(12,2) not null,
  data date not null,
  recorrente boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.creatives (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  plataforma text not null,
  gasto numeric(12,2) not null default 0,
  vendas_atribuidas integer not null default 0,
  status text not null default 'ativo'
);

create table if not exists public.settings (
  id integer primary key default 1,
  aliquota_imposto numeric(5,2) not null default 12.15,
  imposto_ativo boolean not null default true,
  ad_account_id text not null default '',
  token_facebook text,
  graph_api_version text not null default 'v21.0',
  constraint settings_singleton check (id = 1)
);

alter table public.daily_metrics enable row level security;
alter table public.sales enable row level security;
alter table public.leads enable row level security;
alter table public.operational_expenses enable row level security;
alter table public.creatives enable row level security;
alter table public.settings enable row level security;
