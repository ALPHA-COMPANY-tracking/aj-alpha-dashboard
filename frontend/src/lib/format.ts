// Formatação no padrão brasileiro (R$, vírgula decimal) e fuso America/Sao_Paulo.

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const NUM = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
})

const PCT = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** Formata um valor monetário em Reais. Valores inválidos viram R$ 0,00. */
export function formatBRL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return BRL.format(0)
  }
  return BRL.format(value)
}

/** Formata um número inteiro (contagens). */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '0'
  return NUM.format(value)
}

/** Formata uma porcentagem já calculada (ex.: 12.15 -> "12,2%"). */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return '0,0%'
  }
  return `${PCT.format(value)}%`
}

/** Formata ROAS no padrão "0.00x". Gasto zero -> "0.00x". */
export function formatRoas(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return '0.00x'
  }
  return `${value.toFixed(2)}x`
}

/** Divisão segura: retorna 0 quando o divisor é 0 ou inválido. */
export function safeDiv(a: number, b: number): number {
  if (!b || Number.isNaN(b)) return 0
  const r = a / b
  return Number.isFinite(r) ? r : 0
}

const DATE_FMT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const TIME_FMT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return DATE_FMT.format(d)
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return TIME_FMT.format(d)
}

/** "Atualizado há X minutos" / "agora" relativo a `date`. */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 30) return 'agora mesmo'
  if (seconds < 60) return 'há menos de 1 minuto'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  const days = Math.floor(hours / 24)
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`
}
