import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'

type Tone = 'default' | 'positive' | 'negative' | 'accent'

const toneText: Record<Tone, string> = {
  default: 'text-foreground',
  positive: 'text-positive',
  negative: 'text-negative',
  accent: 'text-foreground',
}

// Tile do ícone: o tom "accent" e "default" ganham gradiente violeta.
const toneIcon: Record<Tone, string> = {
  default: 'bg-white/[0.05] text-muted ring-1 ring-white/10',
  positive: 'bg-positive/10 text-positive ring-1 ring-positive/20',
  negative: 'bg-negative/10 text-negative ring-1 ring-negative/20',
  accent: 'bg-accent-gradient text-white shadow-[0_8px_20px_-8px_rgba(230,178,58,0.8)]',
}

export interface DeltaInfo {
  /** variação percentual (ex.: 12.5 = +12,5%) */
  value: number
  /** se true, subir é bom (verde); se false, subir é ruim (custos) */
  goodWhenUp?: boolean
}

function DeltaBadge({ delta }: { delta: DeltaInfo }) {
  if (!Number.isFinite(delta.value) || delta.value === 0) return null
  const up = delta.value > 0
  const good = up === (delta.goodWhenUp ?? true)
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
        good ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative',
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(delta.value).toFixed(1).replace('.', ',')}%
    </span>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  loading = false,
  action,
  delta,
  className,
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: Tone
  loading?: boolean
  action?: ReactNode
  delta?: DeltaInfo
  className?: string
}) {
  return (
    <Card className={cn('group relative h-[124px] overflow-hidden p-4 hover:border-white/[0.12]', className)}>
      {/* brilho sutil no hover */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-accent/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between">
        <span className="text-sm font-semibold text-muted">{label}</span>
        <div className={cn('grid h-8 w-8 place-items-center rounded-xl', toneIcon[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-8 w-28" />
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <span className={cn('text-[24px] font-bold leading-tight tracking-tight', toneText[tone])}>
            {value}
          </span>
          {delta && <DeltaBadge delta={delta} />}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        {hint && !loading && <span className="text-xs text-muted">{hint}</span>}
        {action}
      </div>
    </Card>
  )
}
