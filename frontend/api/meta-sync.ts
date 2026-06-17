import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'node:crypto'
import { syncFacebookSpend } from './_lib/facebook.js'

function tokenValido(req: VercelRequest) {
  const secret = process.env.META_REFRESH_TOKEN
  const received = String(req.headers['x-meta-refresh-token'] ?? req.query.token ?? '')

  if (!secret || !received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'metodo nao permitido' })
  }

  if (!tokenValido(req)) {
    return res.status(401).json({ error: 'nao autorizado' })
  }

  try {
    const days = Math.min(Math.max(Number(req.query.days ?? 1), 1), 7)
    const result = await syncFacebookSpend(days)
    return res.status(200).json({ ok: true, ...result })
  } catch (err) {
    console.error('[api/meta-sync]', err)
    return res.status(500).json({ error: 'falha no sync da meta' })
  }
}
