import type { VercelRequest, VercelResponse } from '@vercel/node'
import { syncFacebookSpend } from '../_lib/facebook'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.authorization

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'nao autorizado' })
  }

  try {
    const result = await syncFacebookSpend(7)
    return res.status(200).json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/meta-sync]', err)
    return res.status(500).json({ error: 'falha no sync da meta' })
  }
}
