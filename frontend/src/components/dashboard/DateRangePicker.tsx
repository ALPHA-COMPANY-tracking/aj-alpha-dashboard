import { useState } from 'react'
import { Calendar } from 'lucide-react'
import type { PeriodPreset } from '../../types'
import { cn } from '../../lib/utils'

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: '7dias', label: 'Últimos 7 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'personalizado', label: 'Personalizado' },
]

export interface DatePickerState {
  preset: PeriodPreset
  from: string
  to: string
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DatePickerState
  onChange: (v: DatePickerState) => void
}) {
  const [open, setOpen] = useState(false)
  const current = PRESETS.find((p) => p.value === value.preset)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-foreground transition-colors hover:bg-surface-2"
      >
        <Calendar className="h-4 w-4 text-accent" />
        {current?.label ?? 'Período'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-border bg-surface p-2 shadow-xl shadow-black/40">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  onChange({ ...value, preset: p.value })
                  if (p.value !== 'personalizado') setOpen(false)
                }}
                className={cn(
                  'block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  value.preset === p.value
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-surface-2 hover:text-foreground',
                )}
              >
                {p.label}
              </button>
            ))}

            {value.preset === 'personalizado' && (
              <div className="space-y-2 border-t border-border p-2 pt-3">
                <label className="block text-xs text-muted">
                  De
                  <input
                    type="date"
                    value={value.from}
                    max={value.to}
                    onChange={(e) => onChange({ ...value, from: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground"
                  />
                </label>
                <label className="block text-xs text-muted">
                  Até
                  <input
                    type="date"
                    value={value.to}
                    min={value.from}
                    onChange={(e) => onChange({ ...value, to: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground"
                  />
                </label>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
