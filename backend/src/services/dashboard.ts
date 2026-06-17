import { prisma } from '../db.js'

// ---------------------------------------------------------------------------
// Cálculo do dashboard a partir dos dados reais do banco (Supabase).
// Mesma lógica/formato do frontend, porém server-side.
// ---------------------------------------------------------------------------

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

export interface DashboardResponse {
  metrics: DashboardMetrics
  previous: DashboardMetrics
  charts: ChartData
}

export interface DashboardParams {
  from: Date
  to: Date
  aliquotaImposto: number
  impostoAtivo: boolean
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOUR_BUCKETS = [
  '06-08', '08-10', '10-12', '12-14', '14-16',
  '16-18', '18-20', '20-22', '22-00',
]

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function safeDiv(a: number, b: number): number {
  if (!b || Number.isNaN(b)) return 0
  const r = a / b
  return Number.isFinite(r) ? r : 0
}

async function computeMetrics(
  from: Date,
  to: Date,
  aliquotaImposto: number,
  impostoAtivo: boolean,
): Promise<DashboardMetrics> {
  const [vendas, leads, daily, despesas] = await Promise.all([
    prisma.sale.findMany({
      where: { tipo: 'venda', dataHora: { gte: from, lte: to } },
      select: { valor: true },
    }),
    prisma.lead.count({ where: { dataHora: { gte: from, lte: to } } }),
    prisma.dailyMetric.findMany({
      where: { data: { gte: from, lte: to } },
      select: { gastoAnuncios: true },
    }),
    prisma.operationalExpense.findMany({
      where: { data: { gte: from, lte: to } },
      select: { valor: true },
    }),
  ])

  const faturamento = round2(vendas.reduce((acc, s) => acc + Number(s.valor), 0))
  const totalVendas = vendas.length
  const gastoAnuncios = round2(daily.reduce((acc, d) => acc + Number(d.gastoAnuncios), 0))
  const gastosOperacionais = round2(despesas.reduce((acc, e) => acc + Number(e.valor), 0))

  const imposto = impostoAtivo ? round2(gastoAnuncios * (aliquotaImposto / 100)) : 0
  const investimentoTotal = round2(gastoAnuncios + imposto)
  const lucroLiquido = round2(faturamento - (gastoAnuncios + imposto + gastosOperacionais))

  return {
    faturamento,
    gastoAnuncios,
    imposto,
    gastosOperacionais,
    lucroLiquido,
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
  const vendas = await prisma.sale.findMany({
    where: { tipo: 'venda', dataHora: { gte: from, lte: to } },
    select: { diaSemana: true, hora: true },
  })

  const porDia = WEEKDAYS.map((dia) => ({ dia, vendas: 0 }))
  const porHora = HOUR_BUCKETS.map((faixa) => ({ faixa, vendas: 0 }))

  for (const v of vendas) {
    if (v.diaSemana >= 0 && v.diaSemana < 7) porDia[v.diaSemana].vendas += 1
    const h = v.hora
    const idx = h >= 6 ? Math.min(Math.floor((h - 6) / 2), HOUR_BUCKETS.length - 1) : HOUR_BUCKETS.length - 1
    porHora[idx].vendas += 1
  }

  return {
    vendasPorDiaSemana: porDia,
    vendasPorHorario: porHora,
    temDadosHorario: vendas.length > 0,
  }
}

/** Intervalo anterior, de mesma duração (para a comparação %). */
function previousRange(from: Date, to: Date): { from: Date; to: Date } {
  const duration = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 1)
  const prevFrom = new Date(prevTo.getTime() - duration)
  return { from: prevFrom, to: prevTo }
}

export async function getDashboard(params: DashboardParams): Promise<DashboardResponse> {
  const { from, to, aliquotaImposto, impostoAtivo } = params
  const prev = previousRange(from, to)

  const [metrics, previous, charts] = await Promise.all([
    computeMetrics(from, to, aliquotaImposto, impostoAtivo),
    computeMetrics(prev.from, prev.to, aliquotaImposto, impostoAtivo),
    computeCharts(from, to),
  ])

  return { metrics, previous, charts }
}
