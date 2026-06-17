import { useMemo, useState } from 'react'
import {
  DollarSign,
  Megaphone,
  TrendingUp,
  ShoppingCart,
  Receipt,
  Target,
  Users,
  UserCheck,
  Percent,
  Crosshair,
  Landmark,
  Layers,
} from 'lucide-react'
import { MetricCard } from '../components/dashboard/MetricCard'
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
import {
  formatBRL,
  formatNumber,
  formatPercent,
  formatRoas,
} from '../lib/format'

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
  const [lastSync, setLastSync] = useState(() => new Date(Date.now() - 4 * 60 * 1000))

  const range = useMemo(
    () =>
      resolvePeriod(picker.preset, {
        from: new Date(`${picker.from}T00:00:00`),
        to: new Date(`${picker.to}T00:00:00`),
      }),
    [picker],
  )

  // Dados reais (API) ou mock, conforme VITE_API_URL.
  const { metrics, previous: prev, charts, loading } = useDashboardData(
    range,
    settings,
    reloadKey,
  )

  const refresh = () => {
    setReloadKey((k) => k + 1)
    setLastSync(new Date())
  }

  const roasTone =
    metrics.gastoAnuncios === 0 || metrics.roas < 1
      ? 'negative'
      : metrics.roas >= 2
        ? 'positive'
        : 'default'

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
            Dashboard Financeiro
          </h1>
          <p className="text-sm text-muted">
            Bem-vindo de volta, <span className="capitalize text-foreground">{nome}</span>. Aqui está o resumo do seu negócio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <MetaAdsIndicator
            spend={metrics.gastoAnuncios}
            lastSync={lastSync}
            loading={loading}
            onRefresh={refresh}
          />
          <DateRangePicker value={picker} onChange={setPicker} />
        </div>
      </div>

      {/* Cartões de métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard
          label="Faturamento Total"
          value={formatBRL(metrics.faturamento)}
          icon={DollarSign}
          tone="accent"
          loading={loading}
          delta={{ value: pctDelta(metrics.faturamento, prev.faturamento) }}
        />
        <MetricCard
          label="Gasto com Anúncios"
          value={formatBRL(metrics.gastoAnuncios)}
          hint="Sincronizado da Meta Ads"
          icon={Megaphone}
          loading={loading}
          delta={{ value: pctDelta(metrics.gastoAnuncios, prev.gastoAnuncios), goodWhenUp: false }}
        />
        <MetricCard
          label="Lucro Líquido"
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
        <MetricCard
          label="Ticket Médio"
          value={formatBRL(metrics.ticketMedio)}
          icon={Receipt}
          loading={loading}
          delta={{ value: pctDelta(metrics.ticketMedio, prev.ticketMedio) }}
        />
        <MetricCard
          label="ROAS"
          value={formatRoas(metrics.roas)}
          hint="Return on Ad Spend"
          icon={Target}
          tone={roasTone}
          loading={loading}
          delta={{ value: pctDelta(metrics.roas, prev.roas) }}
        />
        <MetricCard
          label="Leads Atendidos"
          value={formatNumber(metrics.leads)}
          icon={Users}
          loading={loading}
          delta={{ value: pctDelta(metrics.leads, prev.leads) }}
        />
        <MetricCard
          label="Leads por Venda"
          value={metrics.leadsPorVenda.toFixed(1).replace('.', ',')}
          hint="Quantos leads para 1 venda"
          icon={UserCheck}
          loading={loading}
        />
        <MetricCard
          label="Taxa de Conversão"
          value={formatPercent(metrics.taxaConversao)}
          hint="Vendas ÷ Leads"
          icon={Percent}
          loading={loading}
          delta={{ value: pctDelta(metrics.taxaConversao, prev.taxaConversao) }}
        />
        <MetricCard
          label="CPA Médio"
          value={formatBRL(metrics.cpaMedio)}
          hint="Custo por aquisição"
          icon={Crosshair}
          loading={loading}
          delta={{ value: pctDelta(metrics.cpaMedio, prev.cpaMedio), goodWhenUp: false }}
        />
        <MetricCard
          label="Imposto Meta Ads"
          value={formatBRL(metrics.imposto)}
          hint={`Alíquota ${settings.aliquotaImposto.toFixed(2).replace('.', ',')}%`}
          icon={Landmark}
          tone={settings.impostoAtivo ? 'default' : 'default'}
          loading={loading}
          action={
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted">
                {settings.impostoAtivo ? 'Ativo' : 'Inativo'}
              </span>
              <Toggle
                checked={settings.impostoAtivo}
                onChange={(v) => update({ impostoAtivo: v })}
                label="Imposto ativo"
              />
            </div>
          }
        />
        <MetricCard
          label="Investimento Total"
          value={formatBRL(metrics.investimentoTotal)}
          hint="Anúncios + Imposto"
          icon={Layers}
          loading={loading}
          delta={{ value: pctDelta(metrics.investimentoTotal, prev.investimentoTotal), goodWhenUp: false }}
        />
      </div>

      {/* Gráficos */}
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
