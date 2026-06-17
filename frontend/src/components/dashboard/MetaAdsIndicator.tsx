import { RefreshCw } from 'lucide-react'
import { formatBRL, timeAgo } from '../../lib/format'
import { cn } from '../../lib/utils'

export function MetaAdsIndicator({
  spend,
  lastSync,
  loading,
  onRefresh,
}: {
  spend: number
  lastSync: Date
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1877f2]/15 text-[#4596ff] text-xs font-bold">
        Ads
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-foreground">
          Meta Ads: {formatBRL(spend)}
        </div>
        <div className="text-[11px] text-muted">
          Atualizado {timeAgo(lastSync)}
        </div>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        title="Sincronizar agora"
        className="ml-1 rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-accent disabled:opacity-50"
      >
        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
      </button>
    </div>
  )
}
