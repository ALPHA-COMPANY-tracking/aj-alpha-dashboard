import { supabase } from './supabase'

export interface DashboardMetrics {
  faturamento: number
  gastoAnuncios: number
  imposto: number
  gastosOperacionais: number
  lucroLiquido: number
  totalVendas: number
  ticketMedio: number
  roas: number
  leads: number
  leadsPorVenda: number
  taxaConversao: number
  cpaMedio: number
  investimentoTotal: number
}

export interface ChartData {
  vendasPorDiaSemana: { dia: string; vendas: number }[]
  vendasPorHorario: { faixa: string; vendas: number }[]
  temDadosHorario: boolean
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const HOUR_BUCKETS = [
  '06-08',
  '08-10',
  '10-12',
  '12-14',
  '14-16',
  '16-18',
  '18-20',
  '20-22',
  '22-00',
]

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function safeDiv(a: number, b: number): number {
  if (!b || Number.isNaN(b)) return 0
  const r = a / b
  return Number.isFinite(r) ? r : 0
}

function previousRange(from: Date, to: Date) {
  const duration = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 1)
  const prevFrom = new Date(prevTo.getTime() - duration)
  return { from: prevFrom, to: prevTo }
}

function iso(date: Date) {
  return date.toISOString()
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

async function computeMetrics(
  from: Date,
  to: Date,
  aliquotaImposto: number,
  impostoAtivo: boolean,
): Promise<DashboardMetrics> {
  const [salesRes, leadsRes, dailyRes, expensesRes] = await Promise.all([
    supabase
      .from('sales')
      .select('valor')
      .eq('tipo', 'venda')
      .gte('data_hora', iso(from))
      .lte('data_hora', iso(to)),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('data_hora', iso(from))
      .lte('data_hora', iso(to)),
    supabase
      .from('daily_metrics')
      .select('gasto_anuncios')
      .gte('data', dateOnly(from))
      .lte('data', dateOnly(to)),
    supabase
      .from('operational_expenses')
      .select('valor')
      .gte('data', dateOnly(from))
      .lte('data', dateOnly(to)),
  ])

  for (const result of [salesRes, leadsRes, dailyRes, expensesRes]) {
    if (result.error) throw result.error
  }

  const vendas = salesRes.data ?? []
  const faturamento = round2(
    vendas.reduce((acc, sale) => acc + Number(sale.valor ?? 0), 0),
  )
  const totalVendas = vendas.length
  const leads = leadsRes.count ?? 0
  const gastoAnuncios = round2(
    (dailyRes.data ?? []).reduce(
      (acc, item) => acc + Number(item.gasto_anuncios ?? 0),
      0,
    ),
  )
  const gastosOperacionais = round2(
    (expensesRes.data ?? []).reduce(
      (acc, item) => acc + Number(item.valor ?? 0),
      0,
    ),
  )
  const imposto = impostoAtivo
    ? round2(gastoAnuncios * (aliquotaImposto / 100))
    : 0
  const investimentoTotal = round2(gastoAnuncios + imposto)

  return {
    faturamento,
    gastoAnuncios,
    imposto,
    gastosOperacionais,
    lucroLiquido: round2(
      faturamento - (gastoAnuncios + imposto + gastosOperacionais),
    ),
    totalVendas,
    ticketMedio: safeDiv(faturamento, totalVendas),
    roas: safeDiv(faturamento, gastoAnuncios),
    leads,
    leadsPorVenda: safeDiv(leads, totalVendas),
    taxaConversao: safeDiv(totalVendas, leads) * 100,
    cpaMedio: safeDiv(gastoAnuncios, totalVendas),
    investimentoTotal,
  }
}

async function computeCharts(from: Date, to: Date): Promise<ChartData> {
  const { data, error } = await supabase
    .from('sales')
    .select('dia_semana,hora')
    .eq('tipo', 'venda')
    .gte('data_hora', iso(from))
    .lte('data_hora', iso(to))

  if (error) throw error

  const porDia = WEEKDAYS.map((dia) => ({ dia, vendas: 0 }))
  const porHora = HOUR_BUCKETS.map((faixa) => ({ faixa, vendas: 0 }))

  for (const sale of data ?? []) {
    const diaSemana = Number(sale.dia_semana)
    const hora = Number(sale.hora)
    if (diaSemana >= 0 && diaSemana < 7) porDia[diaSemana].vendas += 1
    const idx =
      hora >= 6
        ? Math.min(Math.floor((hora - 6) / 2), HOUR_BUCKETS.length - 1)
        : HOUR_BUCKETS.length - 1
    porHora[idx].vendas += 1
  }

  return {
    vendasPorDiaSemana: porDia,
    vendasPorHorario: porHora,
    temDadosHorario: (data ?? []).length > 0,
  }
}

export async function getDashboard(params: {
  from: Date
  to: Date
  aliquotaImposto: number
  impostoAtivo: boolean
}) {
  const prev = previousRange(params.from, params.to)

  const [metrics, previous, charts] = await Promise.all([
    computeMetrics(
      params.from,
      params.to,
      params.aliquotaImposto,
      params.impostoAtivo,
    ),
    computeMetrics(
      prev.from,
      prev.to,
      params.aliquotaImposto,
      params.impostoAtivo,
    ),
    computeCharts(params.from, params.to),
  ])

  return { metrics, previous, charts }
}
