import type {
  Chip,
  Creative,
  OperationalExpense,
  Sale,
  SpyAd,
} from '../types'

// ---------------------------------------------------------------------------
// Geração de dados de exemplo (mock). Substituir pela API/webhook reais depois.
// ---------------------------------------------------------------------------

// Gerador pseudo-aleatório determinístico para o mock ser estável entre reloads.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260616)

const ORIGENS = ['FB Feed', 'IG Stories', 'IG Reels', 'FB Reels', 'Direto']
const CRIATIVOS = ['cr-01', 'cr-02', 'cr-03', 'cr-04', 'cr-05']

function buildSales(): Sale[] {
  const sales: Sale[] = []
  const now = new Date()
  // Últimos 45 dias de histórico.
  for (let dayOffset = 44; dayOffset >= 0; dayOffset--) {
    const base = new Date(now)
    base.setDate(now.getDate() - dayOffset)

    // Volume varia por dia da semana (fim de semana mais forte).
    const weekday = base.getDay()
    const weekendBoost = weekday === 0 || weekday === 6 ? 1.4 : 1
    const dailySales = Math.round((4 + rand() * 9) * weekendBoost)
    const dailyLeads = dailySales + Math.round(6 + rand() * 18)

    for (let i = 0; i < dailySales; i++) {
      const hour = 8 + Math.floor(rand() * 15) // entre 8h e 22h
      const minute = Math.floor(rand() * 60)
      const d = new Date(base)
      d.setHours(hour, minute, 0, 0)
      sales.push({
        id: `sale-${dayOffset}-${i}`,
        valor: [67, 97, 127, 197, 247][Math.floor(rand() * 5)],
        dataHora: d.toISOString(),
        criativoId: CRIATIVOS[Math.floor(rand() * CRIATIVOS.length)],
        origem: ORIGENS[Math.floor(rand() * ORIGENS.length)],
        tipo: 'venda',
      })
    }

    for (let i = 0; i < dailyLeads; i++) {
      const hour = 8 + Math.floor(rand() * 15)
      const minute = Math.floor(rand() * 60)
      const d = new Date(base)
      d.setHours(hour, minute, 0, 0)
      sales.push({
        id: `lead-${dayOffset}-${i}`,
        valor: 0,
        dataHora: d.toISOString(),
        origem: ORIGENS[Math.floor(rand() * ORIGENS.length)],
        tipo: 'lead',
      })
    }
  }
  return sales
}

// Gasto diário de anúncios por data (yyyy-mm-dd) — viria do cron da Graph API.
function buildAdSpend(): Record<string, number> {
  const spend: Record<string, number> = {}
  const now = new Date()
  for (let dayOffset = 44; dayOffset >= 0; dayOffset--) {
    const base = new Date(now)
    base.setDate(now.getDate() - dayOffset)
    const key = base.toISOString().slice(0, 10)
    spend[key] = Math.round((180 + rand() * 320) * 100) / 100
  }
  return spend
}

export const MOCK_SALES: Sale[] = buildSales()
export const MOCK_AD_SPEND: Record<string, number> = buildAdSpend()

export const MOCK_EXPENSES: OperationalExpense[] = [
  { id: 'e1', descricao: 'Plataforma de checkout', valor: 99.9, data: isoDaysAgo(10), recorrente: true },
  { id: 'e2', descricao: 'Ferramenta de WhatsApp / CRM', valor: 149.0, data: isoDaysAgo(8), recorrente: true },
  { id: 'e3', descricao: 'Designer (freelance)', valor: 600.0, data: isoDaysAgo(5), recorrente: false },
  { id: 'e4', descricao: 'Chips / linhas', valor: 80.0, data: isoDaysAgo(3), recorrente: true },
  { id: 'e5', descricao: 'Hospedagem e domínio', valor: 45.0, data: isoDaysAgo(1), recorrente: true },
]

export const MOCK_CREATIVES: Creative[] = [
  { id: 'cr-01', nome: 'VSL Antes/Depois', plataforma: 'Facebook', gasto: 2840.5, vendasAtribuidas: 41, status: 'ativo' },
  { id: 'cr-02', nome: 'Depoimento cliente', plataforma: 'Instagram', gasto: 1920.0, vendasAtribuidas: 28, status: 'ativo' },
  { id: 'cr-03', nome: 'Oferta relâmpago', plataforma: 'Facebook', gasto: 1340.75, vendasAtribuidas: 12, status: 'pausado' },
  { id: 'cr-04', nome: 'Reels demonstração', plataforma: 'Instagram', gasto: 980.0, vendasAtribuidas: 19, status: 'ativo' },
  { id: 'cr-05', nome: 'Carrossel benefícios', plataforma: 'Facebook', gasto: 410.0, vendasAtribuidas: 3, status: 'reprovado' },
]

export const MOCK_CHIPS: Chip[] = [
  { id: 'c1', numero: '+55 11 91234-5678', status: 'ativo', dataAquisicao: isoDaysAgo(40), observacao: 'Principal vendas' },
  { id: 'c2', numero: '+55 11 92345-6789', status: 'aquecendo', dataAquisicao: isoDaysAgo(6), observacao: 'Aquecimento dia 6' },
  { id: 'c3', numero: '+55 11 93456-7890', status: 'banido', dataAquisicao: isoDaysAgo(25), observacao: 'Banido por denúncia' },
  { id: 'c4', numero: '+55 11 94567-8901', status: 'reserva', dataAquisicao: isoDaysAgo(2) },
]

export const MOCK_SPY: SpyAd[] = [
  { id: 's1', concorrente: 'Concorrente A', link: 'https://facebook.com/ads/library/?id=123', nicho: 'Emagrecimento', anotacao: 'Usa prova social forte no primeiro 3s', salvoEm: isoDaysAgo(4) },
  { id: 's2', concorrente: 'Concorrente B', link: 'https://facebook.com/ads/library/?id=456', nicho: 'Beleza', anotacao: 'Oferta com escassez (24h)', salvoEm: isoDaysAgo(2) },
]

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}
