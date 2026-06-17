export type SaleType = 'venda' | 'lead'
export type Gateway = 'payt' | 'luminar-pay'
export type Papel = 'produtor' | 'afiliado'

export interface Sale {
  id: string
  valor: number
  dataHora: string // ISO
  criativoId?: string
  origem?: string
  tipo: SaleType
  gateway?: Gateway
  papel?: Papel // produtor x afiliado (relevante para a Payt)
}

export interface OperationalExpense {
  id: string
  descricao: string
  valor: number
  data: string // ISO date
  recorrente: boolean
}

export interface Creative {
  id: string
  nome: string
  plataforma: string
  gasto: number
  vendasAtribuidas: number
  status: 'ativo' | 'pausado' | 'reprovado'
}

export interface Chip {
  id: string
  numero: string
  status: 'aquecendo' | 'ativo' | 'banido' | 'reserva'
  dataAquisicao: string
  observacao?: string
}

export interface SpyAd {
  id: string
  concorrente: string
  link: string
  nicho: string
  anotacao?: string
  salvoEm: string
}

export interface DailyMetric {
  data: string // ISO date (yyyy-mm-dd)
  faturamento: number
  totalVendas: number
  leads: number
  gastoAnuncios: number
  gastosOperacionais: number
  origemAnuncios: 'sync' | 'manual'
}

export interface Settings {
  aliquotaImposto: number // em % (ex.: 12.15)
  impostoAtivo: boolean
  adAccountId: string
  graphApiVersion: string
}

export type PeriodPreset =
  | 'hoje'
  | 'ontem'
  | '7dias'
  | 'mes'
  | 'personalizado'

export interface DateRange {
  preset: PeriodPreset
  from: Date
  to: Date
}
