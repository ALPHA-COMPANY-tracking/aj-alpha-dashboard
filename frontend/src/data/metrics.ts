import type { DailyMetric, DateRange, PeriodPreset, Sale, Settings } from '../types'
import { MOCK_AD_SPEND, MOCK_EXPENSES, MOCK_SALES } from './mock'
import { safeDiv } from '../lib/format'

// ---------------------------------------------------------------------------
// Cálculo das métricas do dashboard a partir do período + configurações.
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
  taxaConversao: number // em %
  cpaMedio: number
  investimentoTotal: number
}

export interface ChartData {
  vendasPorDiaSemana: { dia: string; vendas: number }[]
  vendasPorHorario: { faixa: string; vendas: number }[]
  temDadosHorario: boolean
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Faixas de horário (de 6h às 24h em janelas de 2h).
const HOUR_BUCKETS = [
  '06-08', '08-10', '10-12', '12-14', '14-16',
  '16-18', '18-20', '20-22', '22-00',
]

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/** Resolve um preset de período para um intervalo de datas concreto. */
export function resolvePeriod(preset: PeriodPreset, custom?: { from: Date; to: Date }): DateRange {
  const now = new Date()
  switch (preset) {
    case 'hoje':
      return { preset, from: startOfDay(now), to: endOfDay(now) }
    case 'ontem': {
      const y = new Date(now)
      y.setDate(now.getDate() - 1)
      return { preset, from: startOfDay(y), to: endOfDay(y) }
    }
    case '7dias': {
      const from = new Date(now)
      from.setDate(now.getDate() - 6)
      return { preset, from: startOfDay(from), to: endOfDay(now) }
    }
    case 'mes': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { preset, from: startOfDay(from), to: endOfDay(now) }
    }
    case 'personalizado':
      return {
        preset,
        from: startOfDay(custom?.from ?? now),
        to: endOfDay(custom?.to ?? now),
      }
  }
}

/** Intervalo imediatamente anterior, de mesma duração (para comparação %). */
export function previousRange(range: DateRange): DateRange {
  const duration = range.to.getTime() - range.from.getTime()
  const to = new Date(range.from.getTime() - 1)
  const from = new Date(to.getTime() - duration)
  return { preset: 'personalizado', from, to }
}

/** Variação percentual entre o valor atual e o anterior. */
export function pctDelta(current: number, previous: number): number {
  if (!previous) return 0
  return ((current - previous) / previous) * 100
}

function inRange(iso: string, range: DateRange): boolean {
  const t = new Date(iso).getTime()
  return t >= range.from.getTime() && t <= range.to.getTime()
}

export function filterSales(range: DateRange): Sale[] {
  return MOCK_SALES.filter((s) => inRange(s.dataHora, range))
}

/** Soma o gasto com anúncios (mock do cron da Graph API) no período. */
export function adSpendInRange(range: DateRange): number {
  let total = 0
  for (const [key, value] of Object.entries(MOCK_AD_SPEND)) {
    const d = new Date(`${key}T12:00:00`)
    if (d.getTime() >= range.from.getTime() && d.getTime() <= range.to.getTime()) {
      total += value
    }
  }
  return Math.round(total * 100) / 100
}

function operationalInRange(range: DateRange): number {
  let total = 0
  for (const e of MOCK_EXPENSES) {
    const d = new Date(`${e.data}T12:00:00`)
    if (d.getTime() >= range.from.getTime() && d.getTime() <= range.to.getTime()) {
      total += e.valor
    }
  }
  return Math.round(total * 100) / 100
}

export function computeMetrics(range: DateRange, settings: Settings): DashboardMetrics {
  const sales = filterSales(range)
  const vendas = sales.filter((s) => s.tipo === 'venda')
  const leadsArr = sales.filter((s) => s.tipo === 'lead')

  const faturamento = vendas.reduce((acc, s) => acc + s.valor, 0)
  const totalVendas = vendas.length
  const leads = leadsArr.length
  const gastoAnuncios = adSpendInRange(range)
  const gastosOperacionais = operationalInRange(range)

  const imposto = settings.impostoAtivo
    ? Math.round(gastoAnuncios * (settings.aliquotaImposto / 100) * 100) / 100
    : 0

  const investimentoTotal = Math.round((gastoAnuncios + imposto) * 100) / 100
  const lucroLiquido =
    Math.round((faturamento - (gastoAnuncios + imposto + gastosOperacionais)) * 100) / 100

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

/** Constrói uma linha por dia (últimos `days` dias) a partir do mock. */
export function buildDailyRows(days = 14): DailyMetric[] {
  const rows: DailyMetric[] = []
  const now = new Date()

  for (let offset = 0; offset < days; offset++) {
    const day = new Date(now)
    day.setDate(now.getDate() - offset)
    const key = day.toISOString().slice(0, 10)

    const range: DateRange = {
      preset: 'personalizado',
      from: startOfDay(day),
      to: endOfDay(day),
    }
    const sales = filterSales(range)
    const vendas = sales.filter((s) => s.tipo === 'venda')
    const leads = sales.filter((s) => s.tipo === 'lead')
    const operacional = MOCK_EXPENSES.filter((e) => e.data === key).reduce(
      (acc, e) => acc + e.valor,
      0,
    )

    rows.push({
      data: key,
      faturamento: vendas.reduce((acc, s) => acc + s.valor, 0),
      totalVendas: vendas.length,
      leads: leads.length,
      gastoAnuncios: MOCK_AD_SPEND[key] ?? 0,
      gastosOperacionais: Math.round(operacional * 100) / 100,
      origemAnuncios: 'sync',
    })
  }
  return rows
}

export function computeCharts(range: DateRange): ChartData {
  const vendas = filterSales(range).filter((s) => s.tipo === 'venda')

  const porDia = WEEKDAYS.map((dia) => ({ dia, vendas: 0 }))
  const porHora = HOUR_BUCKETS.map((faixa) => ({ faixa, vendas: 0 }))

  for (const v of vendas) {
    const d = new Date(v.dataHora)
    porDia[d.getDay()].vendas += 1

    const h = d.getHours()
    if (h >= 6) {
      const idx = Math.min(Math.floor((h - 6) / 2), HOUR_BUCKETS.length - 1)
      porHora[idx].vendas += 1
    } else {
      porHora[HOUR_BUCKETS.length - 1].vendas += 1
    }
  }

  return {
    vendasPorDiaSemana: porDia,
    vendasPorHorario: porHora,
    temDadosHorario: vendas.length > 0,
  }
}
