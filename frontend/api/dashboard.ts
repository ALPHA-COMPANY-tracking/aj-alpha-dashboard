import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDashboard } from './_lib/dashboard.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const from = new Date(String(req.query.from ?? ''))
    const to = new Date(String(req.query.to ?? ''))

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return res.status(400).json({ error: 'periodo invalido' })
    }

    const aliquotaImposto = Number(req.query.aliquota ?? 12.15)
    const impostoAtivo = String(req.query.impostoAtivo ?? 'true') === 'true'

    const data = await getDashboard({
      from,
      to,
      aliquotaImposto,
      impostoAtivo,
    })

    res.status(200).json(data)
  } catch (err) {
    console.error('[api/dashboard]', err)
    res.status(500).json({ error: 'falha ao calcular o dashboard' })
  }
}
