import { useMemo, useState } from 'react'
import { Pencil, RefreshCw } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { buildDailyRows } from '../data/metrics'
import { formatBRL, formatDate, formatNumber } from '../lib/format'
import type { DailyMetric } from '../types'

export function DadosDiarios() {
  const [rows, setRows] = useState<DailyMetric[]>(() => buildDailyRows(14))
  const [editing, setEditing] = useState<string | null>(null)

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          faturamento: acc.faturamento + r.faturamento,
          totalVendas: acc.totalVendas + r.totalVendas,
          leads: acc.leads + r.leads,
          gastoAnuncios: acc.gastoAnuncios + r.gastoAnuncios,
          gastosOperacionais: acc.gastosOperacionais + r.gastosOperacionais,
        }),
        { faturamento: 0, totalVendas: 0, leads: 0, gastoAnuncios: 0, gastosOperacionais: 0 },
      ),
    [rows],
  )

  const updateRow = (data: string, patch: Partial<DailyMetric>) =>
    setRows((prev) =>
      prev.map((r) =>
        r.data === data ? { ...r, ...patch, origemAnuncios: 'manual' } : r,
      ),
    )

  return (
    <div>
      <PageHeader
        title="Dados Diários"
        subtitle="Tabela com uma linha por dia. Edite células para corrigir números manualmente."
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Faturamento</th>
                <th className="px-4 py-3 text-right">Vendas</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-4 py-3 text-right">Gasto Ads</th>
                <th className="px-4 py-3 text-right">Op.</th>
                <th className="px-4 py-3 text-center">Origem</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isEditing = editing === r.data
                return (
                  <tr key={r.data} className="border-b border-border/60 hover:bg-surface-2/40">
                    <td className="px-4 py-3 font-medium text-foreground">{formatDate(r.data)}</td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          defaultValue={r.faturamento}
                          onBlur={(e) => updateRow(r.data, { faturamento: Number(e.target.value) })}
                          className="w-24 rounded border border-border bg-surface-2 px-2 py-1 text-right"
                        />
                      ) : (
                        formatBRL(r.faturamento)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{formatNumber(r.totalVendas)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(r.leads)}</td>
                    <td className="px-4 py-3 text-right text-muted">{formatBRL(r.gastoAnuncios)}</td>
                    <td className="px-4 py-3 text-right text-muted">{formatBRL(r.gastosOperacionais)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ' +
                          (r.origemAnuncios === 'sync'
                            ? 'bg-accent-soft text-accent'
                            : 'bg-warning/10 text-warning')
                        }
                      >
                        {r.origemAnuncios === 'sync' ? (
                          <RefreshCw className="h-3 w-3" />
                        ) : (
                          <Pencil className="h-3 w-3" />
                        )}
                        {r.origemAnuncios === 'sync' ? 'Sync' : 'Manual'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditing(isEditing ? null : r.data)}
                        className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-accent"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-surface-2/40 font-semibold text-foreground">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{formatBRL(totals.faturamento)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(totals.totalVendas)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(totals.leads)}</td>
                <td className="px-4 py-3 text-right">{formatBRL(totals.gastoAnuncios)}</td>
                <td className="px-4 py-3 text-right">{formatBRL(totals.gastosOperacionais)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
