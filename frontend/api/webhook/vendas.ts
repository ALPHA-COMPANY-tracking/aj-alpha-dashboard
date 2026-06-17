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

function readNested(obj: unknown, path: string[]): unknown {
  let current = obj
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function firstString(ev: Record<string, unknown>, paths: string[][]): string | null {
  for (const path of paths) {
    const value = readNested(ev, path)
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function normalEmail(email: string | null) {
  return email?.trim().toLowerCase() || null
}

function detectarPapel(
  ev: Record<string, unknown>,
  affiliateEmail: string | null,
): 'produtor' | 'afiliado' {
  const affiliateEmails = (process.env.PAYT_AFFILIATE_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (affiliateEmail && affiliateEmails.includes(affiliateEmail)) return 'afiliado'

  const txt = (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : '')
  const ehAfiliado =
    Boolean(ev.affiliate) ||
    Boolean(ev.affiliate_id) ||
    Boolean(ev.affiliateId) ||
    Boolean(ev.id_affiliate) ||
    txt(ev.commission_type).includes('afili') ||
    txt(ev.type_seller).includes('afili') ||
    txt(ev.role).includes('afili') ||
    txt(ev.type).includes('afili')

  return ehAfiliado ? 'afiliado' : 'produtor'
}

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
  if (!tokenValido(req)) {
    return res.status(401).json({ error: 'token invalido' })
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.status(200).json({ ok: true, validation: true })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'metodo nao permitido' })
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(200).json({ ok: true, validation: true })
  }

  const parsed = PostbackSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'payload invalido' })
  }

  const event = parsed.data
  const eventRecord = event as Record<string, unknown>
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
  const customerEmail = normalEmail(
    firstString(eventRecord, [
      ['customer', 'email'],
      ['client', 'email'],
      ['buyer', 'email'],
      ['email'],
    ]),
  )
  const affiliateEmail = normalEmail(
    firstString(eventRecord, [
      ['affiliate', 'email'],
      ['affiliator', 'email'],
      ['producer_affiliate', 'email'],
      ['affiliate_email'],
      ['affiliator_email'],
    ]),
  )
  const papel =
    gateway === 'payt' ? detectarPapel(eventRecord, affiliateEmail) : 'produtor'

  if (event.test || status !== 'paid' || !externalId) {
    return res.status(200).json({ ok: true, ignored: true })
  }

  const registro = {
    external_id: externalId,
    valor: cents / 100,
    data_hora: dataHora.toISOString(),
    origem: event.link?.url ?? null,
    gateway,
    papel,
    customer_email: customerEmail,
    affiliate_email: affiliateEmail,
    raw_payload: event,
    tipo: 'venda',
    dia_semana: dataHora.getDay(),
    hora: dataHora.getHours(),
  }
  const opts = { onConflict: 'external_id', ignoreDuplicates: true } as const

  try {
    let { error } = await supabase.from('sales').upsert(registro, opts)
    if (error && /(papel|customer_email|affiliate_email|raw_payload)/i.test(error.message ?? '')) {
      const compat: Record<string, unknown> = { ...registro }
      delete compat.papel
      delete compat.customer_email
      delete compat.affiliate_email
      delete compat.raw_payload
      ;({ error } = await supabase.from('sales').upsert(compat, opts))
    }
    if (error) throw error
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[webhook/vendas] erro ao gravar venda', err)
    return res.status(500).json({ error: 'falha ao gravar venda' })
  }
}
