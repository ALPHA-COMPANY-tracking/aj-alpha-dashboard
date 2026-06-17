import type { DashboardMetrics, ChartData } from '../data/metrics'

// URL da API. Na Vercel, vazio significa "mesmo dominio".
const RAW = import.meta.env.VITE_API_URL as string | undefined
const API = RAW ? RAW.replace(/\/$/, '') : ''

/** Em producao tenta usar dados reais; em dev sem VITE_API_URL usa mock. */
export const apiEnabled = Boolean(API) || import.meta.env.PROD

export interface DashboardResponse {
  metrics: DashboardMetrics
  previous: DashboardMetrics
  charts: ChartData
}

export async function fetchDashboard(params: {
  from: Date
  to: Date
  aliquota: number
  impostoAtivo: boolean
}): Promise<DashboardResponse> {
  const q = new URLSearchParams({
    from: params.from.toISOString(),
    to: params.to.toISOString(),
    aliquota: String(params.aliquota),
    impostoAtivo: String(params.impostoAtivo),
  })
  const res = await fetch(`${API}/api/dashboard?${q.toString()}`)
  if (!res.ok) throw new Error(`API respondeu ${res.status}`)
  return res.json() as Promise<DashboardResponse>
}
