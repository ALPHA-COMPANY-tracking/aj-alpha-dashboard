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
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function normalEmail(email: string | null) {
  return email?.trim().toLowerCase() || null
}

function parseAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 10000 ? value / 100 : value
  }

  if (typeof value !== 'string') return null

  const normalized = value
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()

  if (!normalized || normalized === '-') return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function firstAmount(ev: Record<string, unknown>, paths: string[][]): number {
  for (const path of paths) {
    const amount = parseAmount(readNested(ev, path))
    if (amount !== null) return amount
  }
  return 0
}

function parseEventDate(value: string | null): Date {
  if (!value) return new Date()

  const br = value.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  )
  if (br) {
    const [, day, month, year, hour = '00', minute = '00', second = '00'] = br
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`)
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function isApprovedPayment(ev: Record<string, unknown>) {
  const status = [
    ev.status,
    ev.payment_status,
    ev.status_payment,
    ev.status_pagamento,
    ev.purchase_status,
    ev.status_compra,
    ev.event,
    ev.event_name,
    ev.type,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()

  if (status.includes('cancel') || status.includes('reembols') || status.includes('chargeback')) {
    return false
  }

  if (!status) return true

  return (
    status.includes('paid') ||
    status.includes('approved') ||
    status.includes('aprovad') ||
    status.includes('finaliz') ||
    status.includes('faturad')
  )
}

function detectarPapel(
  ev: Record<string, unknown>,
  affiliateEmail: string | null,
  affiliateName: string | null,
): 'produtor' | 'afiliado' {
  const affiliateEmails = (process.env.PAYT_AFFILIATE_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (affiliateEmail && affiliateEmails.includes(affiliateEmail)) return 'afiliado'
  if (affiliateName) return 'afiliado'

  const txt = (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : '')
  const ehAfiliado =
    Boolean(ev.affiliate) ||
    Boolean(ev.affiliate_id) ||
    Boolean(ev.affiliateId) ||
    Boolean(ev.id_affiliate) ||
    Boolean(ev.afiliado) ||
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
  const externalId = firstString(eventRecord, [
    ['transaction_id'],
    ['transaction', 'id'],
    ['transaction', 'code'],
    ['sale_id'],
    ['sale', 'id'],
    ['sale', 'code'],
    ['codigo'],
    ['code'],
    ['id'],
  ])
  const valor = firstAmount(eventRecord, [
    ['voce_recebe'],
    ['você_recebe'],
    ['Voce Recebe'],
    ['Você Recebe'],
    ['net_amount'],
    ['net_value'],
    ['producer_amount'],
    ['balance'],
    ['saldo_venda'],
    ['valor_venda'],
    ['amount'],
    ['value'],
    ['transaction', 'net_amount'],
    ['transaction', 'amount'],
    ['transaction', 'total_price'],
    ['total_price'],
  ])
  const paidAt = firstString(eventRecord, [
    ['transaction', 'paid_at'],
    ['paid_at'],
    ['approved_at'],
    ['data_aprovacao'],
    ['data_aprovacao_pagamento'],
    ['data_aprovação'],
    ['data_venda'],
    ['updated_at'],
    ['created_at'],
  ])
  const dataHora = parseEventDate(paidAt)
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
  const affiliateName = firstString(eventRecord, [
    ['affiliate', 'name'],
    ['affiliator', 'name'],
    ['producer_affiliate', 'name'],
    ['affiliate_name'],
    ['affiliator_name'],
    ['afiliado'],
    ['Afiliado'],
  ])
  const papel =
    gateway === 'payt'
      ? detectarPapel(eventRecord, affiliateEmail, affiliateName)
      : 'produtor'

  if (event.test || !isApprovedPayment(eventRecord) || !externalId || valor <= 0) {
    return res.status(200).json({ ok: true, ignored: true })
  }

  const registro = {
    external_id: externalId,
    valor,
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
