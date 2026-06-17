import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getConfiguredMetaBMs } from './_lib/facebook.js'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    res.status(200).json(getConfiguredMetaBMs())
  } catch (err) {
    console.error('[api/meta-accounts]', err)
    res.status(500).json({ error: 'falha ao buscar contas da meta' })
  }
}
