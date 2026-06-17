import { Router, type Request, type Response } from 'express'
import crypto from 'node:crypto'
import { z } from 'zod'
import { prisma } from '../db.js'

// ---------------------------------------------------------------------------
// Webhook de vendas — Payt e Luminar Pay (ambas usam o formato "Payt postback").
//
// Segurança: nenhuma das duas envia assinatura por header — a proteção é a URL
// secreta. Configure em CADA plataforma a mesma URL:
//     https://SEU_DOMINIO/webhook/vendas/<SALES_WEBHOOK_SECRET>
// O token também é aceito via ?token= ou header x-webhook-token.
//
// Disparo: uma vez por pedido quando o status vira "paid".
// Idempotência: transaction_id. Resposta esperada: qualquer 2xx (sem retry).
// ---------------------------------------------------------------------------

export const webhookRouter = Router()

// Schema tolerante: aceita o postback da Payt e da Luminar Pay. Campos extras
// são ignorados; os valores podem vir aninhados em `transaction` ou na raiz.
const PostbackSchema = z
  .object({
    integration_key: z.string().optional(),
    seller_id: z.string().optional(),
    transaction_id: z.string().optional(),
    id: z.string().optional(),
    type: z.string().optional(), // "order"
    status: z.string().optional(), // "paid", "refused", "refunded", ...
    test: z.boolean().optional(),
    transaction: z
      .object({
        total_price: z.number().optional(), // EM CENTAVOS (68500 = R$ 685,00)
        payment_method: z.string().optional(),
        payment_status: z.string().optional(),
        paid_at: z.string().optional(),
      })
      .optional(),
    // fallbacks caso a plataforma envie na raiz
    total_price: z.number().optional(),
    paid_at: z.string().optional(),
    updated_at: z.string().optional(),
    link: z.object({ url: z.string().optional() }).optional(),
  })
  .passthrough()

type Postback = z.infer<typeof PostbackSchema>

/** Normaliza os dois formatos para um único objeto de venda. */
function normalizar(ev: Postback) {
  const centavos = ev.transaction?.total_price ?? ev.total_price ?? 0
  const paidAt =
    ev.transaction?.paid_at ?? ev.paid_at ?? ev.updated_at ?? new Date().toISOString()
  const gateway = ev.integration_key === 'luminar-pay' ? 'luminar-pay' : 'payt'

  return {
    externalId: ev.transaction_id ?? ev.id ?? null,
    status: ev.status ?? '',
    test: ev.test ?? false,
    valor: centavos / 100, // centavos -> reais
    dataHora: new Date(paidAt),
    origem: ev.link?.url ?? null,
    gateway,
  }
}

/** Compara o token recebido com o segredo (tempo constante). */
function tokenValido(req: Request): boolean {
  const secret = process.env.SALES_WEBHOOK_SECRET
  if (!secret) return false

  const recebido =
    (req.params.token as string | undefined) ??
    (req.query.token as string | undefined) ??
    req.header('x-webhook-token') ??
    ''

  if (!recebido) return false
  const a = Buffer.from(recebido)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

async function processar(req: Request, res: Response) {
  if (!tokenValido(req)) {
    return res.status(401).json({ error: 'token inválido' })
  }

  const parsed = PostbackSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'payload inválido', detalhes: parsed.error.issues })
  }

  const venda = normalizar(parsed.data)

  // Responde rápido; o processamento é idempotente via transaction_id.
  res.status(200).json({ ok: true })

  // Ignora testes, status que não sejam venda paga, ou eventos sem id.
  if (venda.test) return
  if (venda.status !== 'paid') return
  if (!venda.externalId) {
    console.warn('[webhook] evento paid sem transaction_id — ignorado')
    return
  }

  try {
    await prisma.sale.upsert({
      where: { externalId: venda.externalId },
      create: {
        externalId: venda.externalId,
        valor: venda.valor,
        dataHora: venda.dataHora,
        origem: venda.origem,
        gateway: venda.gateway,
        tipo: 'venda',
        diaSemana: venda.dataHora.getDay(),
        hora: venda.dataHora.getHours(),
      },
      update: {}, // já existe -> ignora (idempotente)
    })
    console.log(`[webhook] venda ${venda.gateway} ${venda.externalId} = R$ ${venda.valor.toFixed(2)}`)
  } catch (err) {
    // Já respondemos 200; apenas logamos para observar/reprocessar.
    console.error('[webhook] erro ao gravar venda', venda.externalId, (err as Error).message)
  }
}

// Aceita o token no path (recomendado) ou via query/header.
webhookRouter.post('/vendas/:token', processar)
webhookRouter.post('/vendas', processar)
