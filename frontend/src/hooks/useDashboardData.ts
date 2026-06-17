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

/** Calcula tudo a partir do mock local (fallback / modo demo). */
function mockData(range: DateRange, settings: Settings) {
  return {
    metrics: computeMetrics(range, settings),
    previous: computeMetrics(previousRange(range), settings),
    charts: computeCharts(range),
  }
}

/**
 * Fonte de dados do dashboard. Usa a API real quando VITE_API_URL está
 * configurada; caso contrário (ou em caso de erro) cai para o mock.
 */
export function useDashboardData(
  range: DateRange,
  settings: Settings,
  reloadKey: number,
): DashboardData {
  const [data, setData] = useState(() => mockData(range, settings))
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
          // Fallback para o mock se a API falhar (não quebra a tela).
          console.warn('[dashboard] API indisponível, usando mock:', err.message)
          if (cancelled) return
          setData(mockData(range, settings))
          setLoading(false)
        })
    } else {
      // Modo demo: pequeno delay para exibir o skeleton.
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
