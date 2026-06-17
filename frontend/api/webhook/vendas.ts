import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'node:crypto'
import { z } from 'zod'
import { supabase } from '../_lib/supabase.js'

const PostbackSchema = z
  .object({
    integration_key: z.string().optional(),
    seller_id: z.string().optional(),
    transaction_id: z.string().optional(),
    id: z.string().optional(),
    status: z.string().optional(),
    test: z.boolean().optional(),
    transaction: z
      .object({
        total_price: z.number().optional(),
        paid_at: z.string().optional(),
      })
      .optional(),
    total_price: z.number().optional(),
    paid_at: z.string().optional(),
    updated_at: z.string().optional(),
    link: z.object({ url: z.string().optional() }).optional(),
  })
  .passthrough()

function tokenValido(req: VercelRequest): boolean {
  const secret = process.env.SALES_WEBHOOK_SECRET
  const received =
    String(req.query.token ?? '') ||
    String(req.query.secret ?? '') ||
    String(req.headers['x-webhook-token'] ?? '')

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
    return res.status(401).json({ error: 'token invalido' })
  }

  const parsed = PostbackSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'payload invalido' })
  }

  const event = parsed.data
  const status = event.status ?? ''
  const externalId = event.transaction_id ?? event.id
  const cents = event.transaction?.total_price ?? event.total_price ?? 0
  const paidAt =
    event.transaction?.paid_at ??
    event.paid_at ??
    event.updated_at ??
    new Date().toISOString()
  const dataHora = new Date(paidAt)
  const gateway = event.integration_key === 'luminar-pay' ? 'luminar-pay' : 'payt'

  if (event.test || status !== 'paid' || !externalId) {
    return res.status(200).json({ ok: true, ignored: true })
  }

  try {
    const { error } = await supabase.from('sales').upsert(
      {
        external_id: externalId,
        valor: cents / 100,
        data_hora: dataHora.toISOString(),
        origem: event.link?.url ?? null,
        gateway,
        tipo: 'venda',
        dia_semana: dataHora.getDay(),
        hora: dataHora.getHours(),
      },
      { onConflict: 'external_id', ignoreDuplicates: true },
    )
    if (error) throw error
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[webhook/vendas] erro ao gravar venda', err)
    return res.status(500).json({ error: 'falha ao gravar venda' })
  }
}
