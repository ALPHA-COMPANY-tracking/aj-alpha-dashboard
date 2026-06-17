import { useEffect, useState } from 'react'
import type { DateRange, Settings } from '../types'
import {
  computeCharts,
  computeMetrics,
  previousRange,
  type ChartData,
  type DashboardMetrics,
} from '../data/metrics'
import { apiEnabled, fetchDashboard } from '../lib/api'

interface DashboardData {
  metrics: DashboardMetrics
  previous: DashboardMetrics
  charts: ChartData
  loading: boolean
}

function mockData(range: DateRange, settings: Settings) {
  return {
    metrics: computeMetrics(range, settings),
    previous: computeMetrics(previousRange(range), settings),
    charts: computeCharts(range),
  }
}

function emptyData() {
  const zero: DashboardMetrics = {
    faturamento: 0,
    gastoAnuncios: 0,
    imposto: 0,
    gastosOperacionais: 0,
    lucroLiquido: 0,
    totalVendas: 0,
    ticketMedio: 0,
    roas: 0,
    leads: 0,
    leadsPorVenda: 0,
    taxaConversao: 0,
    cpaMedio: 0,
    investimentoTotal: 0,
    faturamentoPayt: 0,
    faturamentoPaytProdutor: 0,
    faturamentoPaytAfiliado: 0,
    faturamentoLuminar: 0,
  }

  return {
    metrics: zero,
    previous: zero,
    charts: {
      vendasPorDiaSemana: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(
        (dia) => ({ dia, vendas: 0 }),
      ),
      vendasPorHorario: [
        '06-08',
        '08-10',
        '10-12',
        '12-14',
        '14-16',
        '16-18',
        '18-20',
        '20-22',
        '22-00',
      ].map((faixa) => ({ faixa, vendas: 0 })),
      temDadosHorario: false,
    },
  }
}

export function useDashboardData(
  range: DateRange,
  settings: Settings,
  reloadKey: number,
): DashboardData {
  const [data, setData] = useState(() =>
    import.meta.env.PROD ? emptyData() : mockData(range, settings),
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    if (apiEnabled) {
      fetchDashboard({
        from: range.from,
        to: range.to,
        aliquota: settings.aliquotaImposto,
        impostoAtivo: settings.impostoAtivo,
      })
        .then((res) => {
          if (cancelled) return
          setData({ metrics: res.metrics, previous: res.previous, charts: res.charts })
          setLoading(false)
        })
        .catch((err) => {
          console.warn('[dashboard] API indisponivel:', err.message)
          if (cancelled) return
          setData(import.meta.env.PROD ? emptyData() : mockData(range, settings))
          setLoading(false)
        })
    } else {
      const t = setTimeout(() => {
        if (cancelled) return
        setData(mockData(range, settings))
        setLoading(false)
      }, 350)
      return () => {
        cancelled = true
        clearTimeout(t)
      }
    }

    return () => {
      cancelled = true
    }
  }, [range, settings, reloadKey])

  return { ...data, loading }
}
