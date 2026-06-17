import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Store,
  Wallet,
} from 'lucide-react'
import { MetricCard } from '../components/dashboard/MetricCard'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { SalesByHourChart, SalesByWeekdayChart } from '../components/dashboard/Charts'
import {
  DateRangePicker,
  type DatePickerState,
} from '../components/dashboard/DateRangePicker'
import { MetaAdsIndicator } from '../components/dashboard/MetaAdsIndicator'
import { Toggle } from '../components/ui/Toggle'
import { useSettings } from '../context/SettingsContext'
import { useAuth } from '../context/AuthContext'
import { pctDelta, resolvePeriod } from '../data/metrics'
import { useDashboardData } from '../hooks/useDashboardData'
import { formatBRL, formatNumber } from '../lib/format'
import { syncMetaNow } from '../lib/api'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function Dashboard() {
  const { settings, update } = useSettings()
  const { email } = useAuth()
  const nome = (email ?? 'admin').split('@')[0]

  const [picker, setPicker] = useState<DatePickerState>({
    preset: 'hoje',
    from: todayISO(),
    to: todayISO(),
  })

  const [reloadKey, setReloadKey] = useState(0)
  const [syncingMeta, setSyncingMeta] = useState(false)
  const syncInFlight = useRef(false)
  const [lastSync, setLastSync] = useState(() => new Date(Date.now() - 4 * 60 * 1000))

  const range = useMemo(
    () =>
      resolvePeriod(picker.preset, {
        from: new Date(`${picker.from}T00:00:00`),
        to: new Date(`${picker.to}T00:00:00`),
      }),
    [picker],
  )

  const { metrics, previous: prev, charts, loading } = useDashboardData(
    range,
    settings,
    reloadKey,
  )

  const refresh = useCallback(async () => {
    if (syncInFlight.current) return
    syncInFlight.current = true
    setSyncingMeta(true)
    try {
      await syncMetaNow()
    } catch (err) {
      console.warn('[dashboard] falha ao sincronizar Meta Ads:', err)
    } finally {
      setReloadKey((k) => k + 1)
      setLastSync(new Date())
      setSyncingMeta(false)
      syncInFlight.current = false
    }
  }, [])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 5 * 60 * 1000)

    return () => window.clearInterval(interval)
  }, [refresh])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
            Dashboard Financeiro
          </h1>
          <p className="text-sm text-muted">
            Bem-vindo de volta, <span className="capitalize text-foreground">{nome}</span>. Aqui esta o resumo do seu negocio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <MetaAdsIndicator
            spend={metrics.gastoAnuncios}
            lastSync={lastSync}
            loading={loading || syncingMeta}
            onRefresh={refresh}
          />
          <DateRangePicker value={picker} onChange={setPicker} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Investido Total (junção de Investimento + Imposto) */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Investido (Total)
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-accent-gradient text-white shadow-[0_8px_20px_-8px_rgba(230,178,58,0.8)]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>

          {loading ? (
            <Skeleton className="mt-4 h-8 w-32" />
          ) : (
            <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              {formatBRL(metrics.investimentoTotal)}
            </div>
          )}

          <div className="mt-2 space-y-0.5 text-xs text-muted">
            <div>
              investido: <span className="text-foreground">{formatBRL(metrics.gastoAnuncios)}</span>
            </div>
            <div>
              imposto: <span className="text-foreground">{formatBRL(metrics.imposto)}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2">
            <span className="text-[11px] text-muted">
              Imposto {settings.impostoAtivo ? 'Ativo' : 'Inativo'} ·{' '}
              {settings.aliquotaImposto.toFixed(2).replace('.', ',')}%
            </span>
            <Toggle
              checked={settings.impostoAtivo}
              onChange={(v) => update({ impostoAtivo: v })}
              label="Imposto ativo"
            />
          </div>
        </Card>
        <MetricCard
          label="Faturamento Total"
          value={formatBRL(metrics.faturamento)}
          icon={DollarSign}
          tone="accent"
          loading={loading}
          delta={{ value: pctDelta(metrics.faturamento, prev.faturamento) }}
        />
        <MetricCard
          label="Lucro Liquido"
          value={formatBRL(metrics.lucroLiquido)}
          hint="Lucro real"
          icon={TrendingUp}
          tone={metrics.lucroLiquido >= 0 ? 'positive' : 'negative'}
          loading={loading}
          delta={{ value: pctDelta(metrics.lucroLiquido, prev.lucroLiquido) }}
        />
        <MetricCard
          label="Total de Vendas"
          value={formatNumber(metrics.totalVendas)}
          icon={ShoppingCart}
          loading={loading}
          delta={{ value: pctDelta(metrics.totalVendas, prev.totalVendas) }}
        />
      </div>

      {/* Vendas por plataforma */}
      <div>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted">
          Vendas por Plataforma
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Payt: separação produtor x afiliado */}
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">Payt</div>
                <div className="text-xs text-muted">Faturamento do dia</div>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent ring-1 ring-accent/20">
                <Store className="h-[18px] w-[18px]" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="mt-4 h-8 w-32" />
            ) : (
              <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                {formatBRL(metrics.faturamentoPayt)}
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[11px] text-muted">Produtor</div>
                <div className="text-sm font-semibold text-foreground">
                  {formatBRL(metrics.faturamentoPaytProdutor)}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[11px] text-muted">Afiliado</div>
                <div className="text-sm font-semibold text-foreground">
                  {formatBRL(metrics.faturamentoPaytAfiliado)}
                </div>
              </div>
            </div>
          </Card>

          {/* Luminar Pay */}
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">Luminar Pay</div>
                <div className="text-xs text-muted">Faturamento do dia</div>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent-gradient text-white shadow-[0_8px_20px_-8px_rgba(230,178,58,0.8)]">
                <Wallet className="h-[18px] w-[18px]" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="mt-4 h-8 w-32" />
            ) : (
              <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                {formatBRL(metrics.faturamentoLuminar)}
              </div>
            )}
            <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-muted">
              Total recebido pela Luminar Pay no período.
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SalesByWeekdayChart data={charts.vendasPorDiaSemana} loading={loading} />
        <SalesByHourChart
          data={charts.vendasPorHorario}
          hasData={charts.temDadosHorario}
          loading={loading}
        />
      </div>
    </div>
  )
}
