import { Router } from 'express'
import { getDashboard } from '../services/dashboard.js'

// ---------------------------------------------------------------------------
// API consumida pelo frontend (dados reais do dashboard).
// ---------------------------------------------------------------------------

export const apiRouter = Router()

function parseDate(value: unknown, fallback: Date): Date {
  if (typeof value !== 'string') return fallback
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? fallback : d
}

apiRouter.get('/dashboard', async (req, res) => {
  try {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)

    const from = parseDate(req.query.from, startOfToday)
    const to = parseDate(req.query.to, endOfToday)
    const aliquotaImposto = Number(req.query.aliquota ?? 12.15)
    const impostoAtivo = req.query.impostoAtivo !== 'false'

    const data = await getDashboard({
      from,
      to,
      aliquotaImposto: Number.isFinite(aliquotaImposto) ? aliquotaImposto : 12.15,
      impostoAtivo,
    })
    res.json(data)
  } catch (err) {
    console.error('[api/dashboard] erro:', (err as Error).message)
    res.status(500).json({ error: 'falha ao calcular o dashboard' })
  }
})
