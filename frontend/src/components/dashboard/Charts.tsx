import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Clock } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import type { ChartData } from '../../data/metrics'

const VIOLET = '#f5d061'
const INDIGO = '#b8860b'
const GRID = 'rgba(255,255,255,0.06)'
const AXIS = '#b1a487'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#15130d]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="font-medium text-foreground">{label}</div>
      <div className="font-semibold text-violet2">{payload[0].value} vendas</div>
    </div>
  )
}

function ChartShell({
  title,
  subtitle,
  loading,
  children,
}: {
  title: string
  subtitle?: string
  loading: boolean
  children: React.ReactNode
}) {
  return (
    <Card className="p-0">
      <CardHeader title={title} subtitle={subtitle} />
      <div className="h-72 p-3 pt-4">
        {loading ? <Skeleton className="h-full w-full" /> : children}
      </div>
    </Card>
  )
}

export function SalesByWeekdayChart({
  data,
  loading,
}: {
  data: ChartData['vendasPorDiaSemana']
  loading: boolean
}) {
  const maxIdx = data.reduce(
    (best, d, i, arr) => (d.vendas > arr[best].vendas ? i : best),
    0,
  )
  return (
    <ChartShell title="Vendas por Dia da Semana" loading={loading}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="barActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={VIOLET} />
              <stop offset="100%" stopColor={INDIGO} />
            </linearGradient>
            <linearGradient id="barIdle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={VIOLET} stopOpacity={0.45} />
              <stop offset="100%" stopColor={INDIGO} stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="dia" stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(230,178,58,0.08)' }} content={<ChartTooltip />} />
          <Bar dataKey="vendas" radius={[8, 8, 0, 0]} maxBarSize={46}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === maxIdx ? 'url(#barActive)' : 'url(#barIdle)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}

export function SalesByHourChart({
  data,
  hasData,
  loading,
}: {
  data: ChartData['vendasPorHorario']
  hasData: boolean
  loading: boolean
}) {
  return (
    <ChartShell title="Vendas por Horário" loading={loading}>
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={VIOLET} stopOpacity={0.55} />
                <stop offset="60%" stopColor={INDIGO} stopOpacity={0.18} />
                <stop offset="100%" stopColor={INDIGO} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="faixa" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
            <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip cursor={{ stroke: VIOLET, strokeWidth: 1, strokeOpacity: 0.4 }} content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="vendas"
              stroke={VIOLET}
              strokeWidth={2.5}
              fill="url(#areaFill)"
              dot={false}
              activeDot={{ r: 4, fill: VIOLET, stroke: '#fff', strokeWidth: 1 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <Clock className="h-8 w-8 text-muted/50" />
          <p className="max-w-xs text-sm text-muted">
            Dados de horário não disponíveis — novas vendas terão horário
            registrado automaticamente.
          </p>
        </div>
      )}
    </ChartShell>
  )
}
