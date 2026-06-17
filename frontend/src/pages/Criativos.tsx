import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { MOCK_CREATIVES } from '../data/mock'
import { formatBRL, formatNumber, formatRoas, safeDiv } from '../lib/format'

const STATUS_STYLE: Record<string, string> = {
  ativo: 'bg-positive/10 text-positive',
  pausado: 'bg-warning/10 text-warning',
  reprovado: 'bg-negative/10 text-negative',
}

// Faturamento estimado por criativo usando ticket médio aproximado do mock.
const TICKET_APROX = 147

export function Criativos() {
  return (
    <div>
      <PageHeader
        title="Planilha de Criativos"
        subtitle="Desempenho por criativo: gasto, vendas e ROAS."
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Criativo</th>
                <th className="px-4 py-3">Plataforma</th>
                <th className="px-4 py-3 text-right">Gasto</th>
                <th className="px-4 py-3 text-right">Vendas</th>
                <th className="px-4 py-3 text-right">ROAS</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CREATIVES.map((c) => {
                const faturamento = c.vendasAtribuidas * TICKET_APROX
                const roas = safeDiv(faturamento, c.gasto)
                return (
                  <tr key={c.id} className="border-b border-border/60 hover:bg-surface-2/40">
                    <td className="px-4 py-3 font-medium text-foreground">{c.nome}</td>
                    <td className="px-4 py-3 text-muted">{c.plataforma}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(c.gasto)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(c.vendasAtribuidas)}</td>
                    <td
                      className={
                        'px-4 py-3 text-right font-semibold ' +
                        (roas >= 2 ? 'text-positive' : roas < 1 ? 'text-negative' : 'text-foreground')
                      }
                    >
                      {formatRoas(roas)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          'rounded-full px-2.5 py-0.5 text-[11px] capitalize ' + STATUS_STYLE[c.status]
                        }
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
