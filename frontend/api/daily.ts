import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'

// Dados diários reais (uma linha por dia) a partir do Supabase.

interface DailyRow {
  data: string
  faturamento: number
  totalVendas: number
  leads: number
  gastoAnuncios: number
  gastosOperacionais: number
  origemAnuncios: 'sync' | 'manual'
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const days = Math.min(Math.max(Number(req.query.days ?? 14), 1), 90)
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - (days - 1))
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)

    const [salesRes, leadsRes, dailyRes, expRes] = await Promise.all([
      supabase
        .from('sales')
        .select('valor, data_hora, tipo')
        .gte('data_hora', start.toISOString())
        .lte('data_hora', end.toISOString()),
      supabase
        .from('leads')
        .select('data_hora')
        .gte('data_hora', start.toISOString())
        .lte('data_hora', end.toISOString()),
      supabase
        .from('daily_metrics')
        .select('data, gasto_anuncios')
        .gte('data', dateKey(start))
        .lte('data', dateKey(end)),
      supabase
        .from('operational_expenses')
        .select('data, valor')
        .gte('data', dateKey(start))
        .lte('data', dateKey(end)),
    ])

    for (const r of [salesRes, leadsRes, dailyRes, expRes]) {
      if (r.error) throw r.error
    }

    const map = new Map<string, DailyRow>()
    for (let i = 0; i < days; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const k = dateKey(d)
      map.set(k, {
        data: k,
        faturamento: 0,
        totalVendas: 0,
        leads: 0,
        gastoAnuncios: 0,
        gastosOperacionais: 0,
        origemAnuncios: 'sync',
      })
    }

    for (const s of salesRes.data ?? []) {
      const row = map.get(String(s.data_hora).slice(0, 10))
      if (row && s.tipo === 'venda') {
        row.faturamento += Number(s.valor ?? 0)
        row.totalVendas += 1
      }
    }
    for (const l of leadsRes.data ?? []) {
      const row = map.get(String(l.data_hora).slice(0, 10))
      if (row) row.leads += 1
    }
    for (const d of dailyRes.data ?? []) {
      const row = map.get(String(d.data).slice(0, 10))
      if (row) row.gastoAnuncios = Number(d.gasto_anuncios ?? 0)
    }
    for (const e of expRes.data ?? []) {
      const row = map.get(String(e.data).slice(0, 10))
      if (row) row.gastosOperacionais += Number(e.valor ?? 0)
    }

    const rows = Array.from(map.values())
      .map((r) => ({
        ...r,
        faturamento: round2(r.faturamento),
        gastoAnuncios: round2(r.gastoAnuncios),
        gastosOperacionais: round2(r.gastosOperacionais),
      }))
      .sort((a, b) => b.data.localeCompare(a.data))

    res.status(200).json({ rows })
  } catch (err) {
    console.error('[api/daily]', err)
    res.status(500).json({ error: 'falha ao buscar dados diarios' })
  }
}
