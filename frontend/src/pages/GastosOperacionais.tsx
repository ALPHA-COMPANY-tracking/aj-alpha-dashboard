import { useMemo, useState } from 'react'
import { Plus, Trash2, Repeat } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { MOCK_EXPENSES } from '../data/mock'
import { formatBRL, formatDate } from '../lib/format'
import type { OperationalExpense } from '../types'

export function GastosOperacionais() {
  const [items, setItems] = useState<OperationalExpense[]>(MOCK_EXPENSES)
  const [form, setForm] = useState({ descricao: '', valor: '', recorrente: false })

  const total = useMemo(() => items.reduce((acc, i) => acc + i.valor, 0), [items])

  const add = () => {
    if (!form.descricao.trim() || !form.valor) return
    setItems((prev) => [
      {
        id: crypto.randomUUID(),
        descricao: form.descricao.trim(),
        valor: Number(form.valor),
        data: new Date().toISOString().slice(0, 10),
        recorrente: form.recorrente,
      },
      ...prev,
    ])
    setForm({ descricao: '', valor: '', recorrente: false })
  }

  return (
    <div>
      <PageHeader
        title="Gastos Operacionais"
        subtitle="Despesas fixas e variáveis fora dos anúncios. O total entra no cálculo do lucro líquido."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-center">Tipo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-border/60 hover:bg-surface-2/40">
                    <td className="px-4 py-3 text-foreground">{i.descricao}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(i.valor)}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(i.data)}</td>
                    <td className="px-4 py-3 text-center">
                      {i.recorrente ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">
                          <Repeat className="h-3 w-3" /> Recorrente
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted">Único</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setItems((p) => p.filter((x) => x.id !== i.id))}
                        className="rounded-lg p-1.5 text-muted hover:bg-negative/10 hover:text-negative"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2/40 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right text-accent">{formatBRL(total)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <Card className="h-fit p-5">
          <h3 className="mb-4 font-semibold">Nova despesa</h3>
          <div className="space-y-3">
            <input
              placeholder="Descrição"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Valor (R$)"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={form.recorrente}
                onChange={(e) => setForm({ ...form, recorrente: e.target.checked })}
                className="h-4 w-4 accent-accent"
              />
              Despesa recorrente
            </label>
            <Button variant="primary" onClick={add} className="w-full">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
