import { useState } from 'react'
import { Save, ShieldCheck, Check } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Toggle } from '../components/ui/Toggle'
import { useSettings } from '../context/SettingsContext'

export function Configuracoes() {
  const { settings, update } = useSettings()
  const [token, setToken] = useState('')
  const [saved, setSaved] = useState(false)

  const flash = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Tokens de API, alíquota de imposto e preferências."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Imposto */}
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Imposto Meta Ads</h3>
          <label className="mb-1 block text-sm text-muted">Alíquota (%)</label>
          <input
            type="number"
            step="0.01"
            value={settings.aliquotaImposto}
            onChange={(e) => update({ aliquotaImposto: Number(e.target.value) })}
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface-2/50 px-3 py-2.5">
            <div className="text-sm">
              <div className="text-foreground">Cálculo de imposto</div>
              <div className="text-xs text-muted">
                {settings.impostoAtivo ? 'Ativo' : 'Inativo'} no cálculo do lucro
              </div>
            </div>
            <Toggle
              checked={settings.impostoAtivo}
              onChange={(v) => update({ impostoAtivo: v })}
            />
          </div>
        </Card>

        {/* Integração Facebook */}
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Integração Meta / Facebook Ads</h3>
          <label className="mb-1 block text-sm text-muted">ID da conta de anúncios</label>
          <input
            placeholder="act_1234567890"
            value={settings.adAccountId}
            onChange={(e) => update({ adAccountId: e.target.value })}
            className="mb-3 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <label className="mb-1 block text-sm text-muted">Versão da Graph API</label>
          <input
            value={settings.graphApiVersion}
            onChange={(e) => update({ graphApiVersion: e.target.value })}
            className="mb-3 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <label className="mb-1 block text-sm text-muted">System User Access Token</label>
          <input
            type="password"
            placeholder="••••••••••••••••"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            O token nunca é exposto no frontend — em produção é enviado ao backend
            e guardado de forma criptografada em variável de ambiente.
          </p>
        </Card>
      </div>

      <div className="mt-4">
        <Button variant="primary" onClick={flash}>
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Salvo!' : 'Salvar configurações'}
        </Button>
      </div>
    </div>
  )
}
