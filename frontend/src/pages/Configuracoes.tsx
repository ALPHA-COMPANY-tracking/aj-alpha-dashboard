import { useEffect, useState, type ReactNode } from 'react'
import {
  ShoppingCart,
  Target,
  Link2,
  Copy,
  Check,
  RefreshCw,
  Info,
  CircleCheck,
  Plus,
  ChevronDown,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Toggle } from '../components/ui/Toggle'
import { cn } from '../lib/utils'

// ---------------------------------------------------------------------------
// Persistência simples em localStorage.
// ---------------------------------------------------------------------------
function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue] as const
}

function genKey(): string {
  const a = new Uint8Array(24)
  crypto.getRandomValues(a)
  return Array.from(a)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface BM {
  id: string
  nome: string
  ativa: boolean
  contas: number
  total: number
  verificado: boolean
}

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------
function Callout({
  tone = 'info',
  icon,
  children,
}: {
  tone?: 'info' | 'success'
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-4 text-sm',
        tone === 'success'
          ? 'border-positive/30 bg-positive/10 text-foreground'
          : 'border-white/10 bg-white/[0.03] text-muted',
      )}
    >
      <span className={tone === 'success' ? 'text-positive' : 'text-muted'}>{icon}</span>
      <div>{children}</div>
    </div>
  )
}

function StepList({ titulo, passos }: { titulo: string; passos: ReactNode[] }) {
  return (
    <div className="mt-5">
      <h4 className="mb-2 text-sm font-semibold text-foreground">{titulo}</h4>
      <ol className="space-y-1.5">
        {passos.map((p, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted">
            <span className="font-semibold text-accent">{i + 1}.</span>
            <span>{p}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function WebhookField({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        className="w-full truncate rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-mono text-xs text-foreground"
      />
      <button
        onClick={copy}
        title="Copiar"
        className="shrink-0 rounded-xl border border-border bg-surface-2 p-2.5 text-muted transition-colors hover:text-accent"
      >
        {copiado ? <Check className="h-4 w-4 text-positive" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  )
}

function Badge({ children, tone = 'positive' }: { children: ReactNode; tone?: 'positive' | 'muted' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        tone === 'positive'
          ? 'bg-positive/15 text-positive'
          : 'bg-white/[0.06] text-muted ring-1 ring-white/10',
      )}
    >
      {children}
    </span>
  )
}

const TABS = [
  { id: 'vendas' as const, label: 'Plataformas de Vendas', icon: ShoppingCart },
  { id: 'meta' as const, label: 'Meta Ads', icon: Target },
]

export function Configuracoes() {
  const [tab, setTab] = useState<'vendas' | 'meta'>('vendas')
  const [metaTab, setMetaTab] = useState<'overview' | 'bms'>('overview')
  const [chave, setChave] = useStored('aj.webhookSecret', genKey())
  const [bms, setBms] = useStored<BM[]>('aj.metaBMs', [])
  const [expandido, setExpandido] = useState<string | null>(null)
  const [novoBM, setNovoBM] = useState({ nome: '', total: '' })

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const webhookUrl = `${origin}/api/webhook/vendas/${chave}`

  const bmsAtivas = bms.filter((b) => b.ativa).length
  const totalContas = bms.reduce((acc, b) => acc + b.total, 0)

  const regenerar = () => {
    if (confirm('Gerar uma nova chave? Você precisará atualizar a URL nas plataformas e no Vercel.')) {
      setChave(genKey())
    }
  }

  const addBM = () => {
    if (!novoBM.nome.trim()) return
    const total = Number(novoBM.total) || 0
    setBms((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: novoBM.nome.trim(),
        ativa: true,
        contas: total,
        total,
        verificado: false,
      },
    ])
    setNovoBM({ nome: '', total: '' })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Configurações"
        subtitle="Configure integrações e preferências do sistema"
      />

      {/* Abas principais */}
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.06] bg-surface/40 p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors',
              tab === id ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'vendas' && (
        <div className="space-y-4">
          {/* Chave de Segurança */}
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-bold">Chave de Segurança</h3>
            </div>
            <p className="mt-1 text-sm text-muted">
              Sua chave única é usada para autenticar os webhooks de todas as plataformas.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Se você suspeitar que sua chave foi comprometida, regenere-a. Lembre-se de
                atualizar as URLs em todas as plataformas e o <code className="text-accent">SALES_WEBHOOK_SECRET</code> no Vercel.
              </p>
              <Button onClick={regenerar} className="shrink-0">
                <RefreshCw className="h-4 w-4" /> Regenerar Chave
              </Button>
            </div>
          </Card>

          {/* Integração Payt */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-bold">Integração Payt</h3>
              </div>
              <Badge>Ativa</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              Conecte sua conta Payt para sincronizar automaticamente suas vendas.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">URL do Webhook Payt</label>
              <WebhookField url={webhookUrl} />
            </div>
            <StepList
              titulo="Como configurar na Payt"
              passos={[
                <>Acesse o painel da Payt em <strong className="text-foreground">payt.com.br</strong></>,
                <>Vá em <strong className="text-foreground">Minha Conta → Integrações</strong> ou <strong className="text-foreground">Configurações → Postback</strong></>,
                <>Cole a URL acima no campo de <strong className="text-foreground">URL de Postback</strong></>,
                <>Ative notificações para <strong className="text-foreground">Pagamento aprovado</strong> e <strong className="text-foreground">Reembolso</strong></>,
                <>Salve as configurações</>,
              ]}
            />
          </Card>

          {/* Integração Luminar Pay */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-bold">Integração Luminar Pay</h3>
              </div>
              <Badge>Ativa</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              Conecte sua conta Luminar Pay para sincronizar automaticamente suas vendas.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">URL do Webhook Luminar Pay</label>
              <WebhookField url={webhookUrl} />
            </div>
            <StepList
              titulo="Como configurar na Luminar Pay"
              passos={[
                <>Acesse o painel da Luminar Pay</>,
                <>Vá em <strong className="text-foreground">Configurações → Webhooks / Postback</strong></>,
                <>Cole a URL acima no campo de <strong className="text-foreground">URL de Postback</strong></>,
                <>Ative os eventos: <strong className="text-foreground">Venda aprovada</strong> e <strong className="text-foreground">Reembolso</strong></>,
                <>Salve as configurações</>,
              ]}
            />
          </Card>

          <Callout icon={<Info className="h-5 w-5" />}>
            <strong className="text-foreground">Importante:</strong> não compartilhe suas URLs de
            webhook com ninguém. Elas contêm uma chave de segurança única que protege sua conta.
          </Callout>

          <Callout tone="success" icon={<CircleCheck className="h-5 w-5" />}>
            <strong className="text-foreground">Pronto!</strong> Após configurar, suas vendas de
            ambas as plataformas serão sincronizadas automaticamente com o dashboard em tempo real.
          </Callout>
        </div>
      )}

      {tab === 'meta' && (
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-bold">Integração Meta Ads</h3>
          </div>
          <p className="mt-1 text-sm text-muted">
            Conecte suas Business Managers do Meta para sincronizar automaticamente seus gastos com anúncios.
          </p>

          {/* Sub-abas */}
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.06] bg-surface-2/40 p-1.5">
            {(['overview', 'bms'] as const).map((id) => (
              <button
                key={id}
                onClick={() => setMetaTab(id)}
                className={cn(
                  'rounded-xl py-2 text-sm font-medium transition-colors',
                  metaTab === id ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground',
                )}
              >
                {id === 'overview' ? 'Visão Geral' : 'Configurar BMs'}
              </button>
            ))}
          </div>

          {metaTab === 'overview' && (
            <div className="mt-5 space-y-5">
              {/* Conexão rápida */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h4 className="font-semibold">Conexão Rápida</h4>
                <p className="mt-1 text-sm text-muted">
                  Conecte-se com sua conta do Facebook para importar automaticamente suas contas de anúncios.
                </p>
                <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877f2] py-2.5 font-semibold text-white transition-colors hover:bg-[#1877f2]/90">
                  <span className="grid h-4 w-4 place-items-center rounded-sm bg-white/20 text-[11px] font-black leading-none">f</span>
                  Conectar com Facebook
                </button>
              </div>

              <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted">
                <span className="h-px flex-1 bg-border" /> ou configure manualmente <span className="h-px flex-1 bg-border" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: bms.length, l: 'BMs Configuradas', c: 'text-foreground' },
                  { v: bmsAtivas, l: 'BMs Ativas', c: 'text-positive' },
                  { v: totalContas, l: 'Ad Accounts', c: 'text-foreground' },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <div className={cn('text-2xl font-bold', s.c)}>{s.v}</div>
                    <div className="mt-1 text-xs text-muted">{s.l}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-1.5 text-sm font-medium text-foreground">Status da Integração</div>
                {bmsAtivas > 0 ? (
                  <Badge>Conectado ({bmsAtivas} {bmsAtivas === 1 ? 'BM ativa' : 'BMs ativas'})</Badge>
                ) : (
                  <Badge tone="muted">Não conectado</Badge>
                )}
              </div>

              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-gradient py-2.5 font-semibold text-white">
                <RefreshCw className="h-4 w-4" /> Sincronizar Dados do Meta Ads
              </button>

              <Callout tone="success" icon={<CircleCheck className="h-5 w-5" />}>
                <strong className="text-foreground">Conectado!</strong> Use o botão de sincronização
                para buscar os dados mais recentes. Os gastos serão exibidos automaticamente no dashboard.
              </Callout>

              <StepList
                titulo="Como obter o Access Token (manual)"
                passos={[
                  <>Acesse <strong className="text-foreground">developers.facebook.com</strong></>,
                  <>Crie ou selecione seu App</>,
                  <>Adicione o produto <strong className="text-foreground">Marketing API</strong></>,
                  <>Gere um token de Sistema com permissão <strong className="text-foreground">ads_read</strong></>,
                  <>Para obter os IDs das contas, acesse o <strong className="text-foreground">Business Manager → Configurações de Negócio → Contas</strong></>,
                ]}
              />

              <Callout icon={<Info className="h-5 w-5" />}>
                <strong className="text-foreground">Importante:</strong> seus Access Tokens são
                armazenados de forma segura e usados apenas para buscar seus dados de anúncios.
              </Callout>
            </div>
          )}

          {metaTab === 'bms' && (
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Business Managers</h4>
                  <p className="text-sm text-muted">Gerencie suas BMs e seus respectivos Ad Accounts.</p>
                </div>
              </div>

              {/* Adicionar BM */}
              <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:flex-row">
                <input
                  placeholder="Nome da BM (ex.: BM 01 - PRINCIPAL)"
                  value={novoBM.nome}
                  onChange={(e) => setNovoBM({ ...novoBM, nome: e.target.value })}
                  className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Nº de contas"
                  value={novoBM.total}
                  onChange={(e) => setNovoBM({ ...novoBM, total: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm sm:w-32"
                />
                <Button variant="primary" onClick={addBM} className="shrink-0">
                  <Plus className="h-4 w-4" /> Adicionar BM
                </Button>
              </div>

              {/* Lista */}
              <div className="mt-3 space-y-2">
                {bms.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted">
                    Nenhuma BM cadastrada. Adicione a primeira acima.
                  </p>
                )}
                {bms.map((bm) => (
                  <div key={bm.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center gap-2 p-3">
                      <span className="flex-1 truncate font-medium text-foreground">{bm.nome}</span>
                      {bm.ativa && <Badge>Ativa</Badge>}
                      <Badge tone="muted">{bm.contas}/{bm.total} contas</Badge>
                      <span className="hidden items-center gap-1 text-[11px] text-muted sm:flex">
                        <Info className="h-3 w-3" /> Não verificado
                      </span>
                      <Toggle
                        checked={bm.ativa}
                        onChange={(v) =>
                          setBms((prev) => prev.map((b) => (b.id === bm.id ? { ...b, ativa: v } : b)))
                        }
                      />
                      <button
                        onClick={() => setExpandido(expandido === bm.id ? null : bm.id)}
                        className="rounded-lg p-1.5 text-muted hover:text-foreground"
                      >
                        <ChevronDown className={cn('h-4 w-4 transition-transform', expandido === bm.id && 'rotate-180')} />
                      </button>
                    </div>
                    {expandido === bm.id && (
                      <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2.5 text-sm text-muted">
                        <span>{bm.total} Ad Account{bm.total === 1 ? '' : 's'} nesta BM</span>
                        <button
                          onClick={() => setBms((prev) => prev.filter((b) => b.id !== bm.id))}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-negative hover:bg-negative/10"
                        >
                          <Trash2 className="h-4 w-4" /> Remover
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
