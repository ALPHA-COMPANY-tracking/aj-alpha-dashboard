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
  CircleAlert,
  Plus,
  ChevronDown,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Toggle } from '../components/ui/Toggle'
import { cn } from '../lib/utils'
import { fetchMetaAccounts, type MetaAccountsResponse } from '../lib/api'

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

type TokenStatus = 'nao_verificado' | 'valido' | 'invalido' | 'configurado'

interface AdAccount {
  id: string
  selecionada: boolean
  moeda: 'BRL' | 'USD'
}

interface BM {
  id: string
  nome: string
  ativa: boolean
  token: string
  tokenStatus: TokenStatus
  contas: AdAccount[]
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

function Badge({
  children,
  tone = 'positive',
}: {
  children: ReactNode
  tone?: 'positive' | 'muted' | 'negative' | 'cyan'
}) {
  const tones = {
    positive: 'bg-positive/15 text-positive',
    cyan: 'bg-accent/15 text-accent ring-1 ring-accent/30',
    muted: 'bg-white/[0.06] text-muted ring-1 ring-white/10',
    negative: 'bg-negative/10 text-negative ring-1 ring-negative/30',
  }
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium', tones[tone])}>
      {children}
    </span>
  )
}

const TABS = [
  { id: 'vendas' as const, label: 'Plataformas de Vendas', icon: ShoppingCart },
  { id: 'meta' as const, label: 'Meta Ads', icon: Target },
]

// ---------------------------------------------------------------------------
// Card de uma Business Manager
// ---------------------------------------------------------------------------
function BMCard({
  bm,
  onChange,
  onRemove,
  readonly = false,
}: {
  bm: BM
  onChange: (patch: Partial<BM>) => void
  onRemove: () => void
  readonly?: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState(false)
  const [verToken, setVerToken] = useState(false)
  const [novaConta, setNovaConta] = useState('')

  const selecionadas = bm.contas.filter((c) => c.selecionada).length

  const setConta = (id: string, patch: Partial<AdAccount>) =>
    onChange({ contas: bm.contas.map((c) => (c.id === id ? { ...c, ...patch } : c)) })

  const addConta = () => {
    const id = novaConta.trim()
    if (!id) return
    onChange({ contas: [...bm.contas, { id, selecionada: true, moeda: 'BRL' }] })
    setNovaConta('')
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        <span className="font-semibold text-foreground">{bm.nome}</span>
        {bm.ativa && <Badge tone="cyan">Ativa</Badge>}
        <Badge tone="muted">{selecionadas}/{bm.contas.length} contas</Badge>
        {bm.tokenStatus === 'invalido' && (
          <Badge tone="negative">
            <span className="inline-flex items-center gap-1"><CircleAlert className="h-3 w-3" /> Inválido</span>
          </Badge>
        )}
        {bm.tokenStatus === 'valido' && <Badge tone="positive">Válido</Badge>}
        {bm.tokenStatus === 'configurado' && <Badge tone="positive">Sincronizada</Badge>}
        {bm.tokenStatus === 'nao_verificado' && <Badge tone="muted">Não verificado</Badge>}
        <RefreshCw className="h-4 w-4 text-muted" />
        <div className="ml-auto flex items-center gap-2">
          {!readonly && <Toggle checked={bm.ativa} onChange={(v) => onChange({ ativa: v })} />}
          <button
            onClick={() => setAberto((o) => !o)}
            className="rounded-lg p-1.5 text-muted hover:text-foreground"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', aberto && 'rotate-180')} />
          </button>
        </div>
      </div>

      {aberto && (
        <div className="space-y-4 border-t border-white/[0.06] p-4">
          {bm.tokenStatus === 'invalido' && (
            <div className="rounded-2xl border border-negative/40 bg-negative/10 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-negative">
                <CircleAlert className="h-4 w-4" /> Token Inválido
              </div>
              <p className="mt-1 text-negative/90">
                Permissões insuficientes. O token precisa das permissões <strong>ads_read</strong>.
                Reconecte sua conta pelo Facebook Login.
              </p>
              <a
                href="https://business.facebook.com/settings/system-users"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-medium text-negative underline"
              >
                Gerar novo token no Meta Business Suite <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Nome da BM</label>
            <input
              readOnly={!editando}
              value={bm.nome}
              onChange={(e) => onChange({ nome: e.target.value })}
              className={cn(
                'w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm',
                !editando && 'text-muted',
              )}
            />
          </div>

          {!readonly && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Access Token</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly={!editando}
                  type={verToken ? 'text' : 'password'}
                  value={bm.token}
                  placeholder="EAAB..."
                  onChange={(e) => onChange({ token: e.target.value })}
                  className="w-full truncate rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-mono text-xs text-muted"
                />
                <button
                  onClick={() => setVerToken((v) => !v)}
                  className="shrink-0 rounded-xl border border-border bg-surface-2 p-2.5 text-muted hover:text-foreground"
                  title={verToken ? 'Ocultar' : 'Mostrar'}
                >
                  {verToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Ad Accounts */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Ad Accounts</label>
            <div className="space-y-2">
              {bm.contas.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface-2/60 px-3 py-2.5"
                >
                  <button
                    onClick={() => setConta(c.id, { selecionada: !c.selecionada })}
                    title={c.selecionada ? 'Não sincronizar' : 'Sincronizar'}
                    className={cn(
                      'grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors',
                      c.selecionada ? 'bg-accent text-white' : 'border border-border text-transparent',
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <span className="flex-1 truncate font-mono text-sm text-foreground">{c.id}</span>
                  <button
                    onClick={() => setConta(c.id, { moeda: c.moeda === 'BRL' ? 'USD' : 'BRL' })}
                    title="Alternar moeda"
                  >
                    <Badge tone="cyan">{c.moeda}</Badge>
                  </button>
                  <Badge tone="cyan">Ativa</Badge>
                  {editando && (
                    <button
                      onClick={() => onChange({ contas: bm.contas.filter((x) => x.id !== c.id) })}
                      className="text-muted hover:text-negative"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {editando && (
                <div className="flex items-center gap-2">
                  <input
                    placeholder="ID da conta (ex.: 542086958254702)"
                    value={novaConta}
                    onChange={(e) => setNovaConta(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addConta()}
                    className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-xs"
                  />
                  <Button onClick={addConta} className="shrink-0">
                    <Plus className="h-4 w-4" /> Conta
                  </Button>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">
              Desmarque as contas que não deseja sincronizar. Clique em <strong>BRL/USD</strong> para
              definir a moeda — contas em USD ficam isentas do imposto Meta Ads.
            </p>
          </div>

          {/* Ações */}
          {!readonly && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditando((e) => !e)}
              className={cn(
                'flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors',
                editando
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border bg-surface-2 text-foreground hover:bg-surface-2/70',
              )}
            >
              {editando ? 'Concluir edição' : 'Editar'}
            </button>
            <button
              onClick={onRemove}
              title="Excluir BM"
              className="rounded-xl bg-negative/90 p-2.5 text-white hover:bg-negative"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
export function Configuracoes() {
  const [tab, setTab] = useState<'vendas' | 'meta'>('vendas')
  const [metaTab, setMetaTab] = useState<'overview' | 'bms'>('overview')
  const [chave, setChave] = useStored('aj.webhookSecret', genKey())
  const [bms, setBms] = useStored<BM[]>('aj.metaBMs', [])
  const [metaConfig, setMetaConfig] = useState<MetaAccountsResponse | null>(null)
  const [metaConfigLoading, setMetaConfigLoading] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [novoBM, setNovoBM] = useState({ nome: '', token: '', contas: '' })

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const webhookUrl = `${origin}/api/webhook/vendas/${chave}`

  useEffect(() => {
    setMetaConfigLoading(true)
    fetchMetaAccounts()
      .then(setMetaConfig)
      .catch(() => setMetaConfig(null))
      .finally(() => setMetaConfigLoading(false))
  }, [])

  const serverBms: BM[] =
    metaConfig?.bms.map((bm) => ({
      id: bm.nome,
      nome: bm.nome,
      ativa: true,
      token: 'Token protegido na Vercel',
      tokenStatus: 'configurado' as const,
      contas: bm.contas.map((id) => ({ id, selecionada: true, moeda: 'BRL' as const })),
    })) ?? []
  const usandoConfigServidor = serverBms.length > 0
  const bmsVisiveis = usandoConfigServidor ? serverBms : bms
  const bmsAtivas = usandoConfigServidor ? serverBms.length : bms.filter((b) => b.ativa).length
  const totalContas = usandoConfigServidor
    ? (metaConfig?.uniqueAccounts ?? 0)
    : bms.reduce((acc, b) => acc + b.contas.length, 0)

  const regenerar = () => {
    if (confirm('Gerar uma nova chave? Você precisará atualizar a URL nas plataformas e o SALES_WEBHOOK_SECRET no Vercel.')) {
      setChave(genKey())
    }
  }

  const addBM = () => {
    if (!novoBM.nome.trim()) return
    const contas: AdAccount[] = novoBM.contas
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((id) => ({ id, selecionada: true, moeda: 'BRL' as const }))
    setBms((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: novoBM.nome.trim(),
        ativa: true,
        token: novoBM.token.trim(),
        tokenStatus: 'nao_verificado',
        contas,
      },
    ])
    setNovoBM({ nome: '', token: '', contas: '' })
    setMostrarForm(false)
  }

  const patchBM = (id: string, patch: Partial<BM>) =>
    setBms((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Configurações" subtitle="Configure integrações e preferências do sistema" />

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
                Se você suspeitar que sua chave foi comprometida, regenere-a. Lembre-se de atualizar as
                URLs em todas as plataformas e o <code className="text-accent">SALES_WEBHOOK_SECRET</code> no Vercel.
              </p>
              <Button onClick={regenerar} className="shrink-0">
                <RefreshCw className="h-4 w-4" /> Regenerar Chave
              </Button>
            </div>
          </Card>

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
            <strong className="text-foreground">Pronto!</strong> Após configurar, suas vendas de ambas
            as plataformas serão sincronizadas automaticamente com o dashboard em tempo real.
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

              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    v: usandoConfigServidor ? metaConfig?.totalBMs ?? 0 : bms.length,
                    l: 'BMs Configuradas',
                    c: 'text-foreground',
                  },
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
                {metaConfigLoading ? (
                  <Badge tone="muted">Carregando...</Badge>
                ) : bmsAtivas > 0 ? (
                  <Badge>Conectado ({bmsAtivas} {bmsAtivas === 1 ? 'BM ativa' : 'BMs ativas'})</Badge>
                ) : (
                  <Badge tone="muted">Não conectado</Badge>
                )}
              </div>

              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-gradient py-2.5 font-semibold text-white">
                <RefreshCw className="h-4 w-4" /> Sincronizar Dados do Meta Ads
              </button>

              <Callout tone="success" icon={<CircleCheck className="h-5 w-5" />}>
                <strong className="text-foreground">Conectado!</strong> Use o botão de sincronização para
                buscar os dados mais recentes. Os gastos serão exibidos automaticamente no dashboard.
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
                  <p className="text-sm text-muted">
                    {usandoConfigServidor
                      ? 'BMs sincronizadas pela Vercel. Tokens ficam ocultos por seguranca.'
                      : 'Gerencie suas BMs e seus respectivos Ad Accounts.'}
                  </p>
                </div>
                {!usandoConfigServidor && (
                  <Button variant="primary" onClick={() => setMostrarForm((m) => !m)} className="shrink-0">
                    <Plus className="h-4 w-4" /> Adicionar BM
                  </Button>
                )}
              </div>

              {usandoConfigServidor && (
                <div className="mt-4">
                  <Callout tone="success" icon={<CircleCheck className="h-5 w-5" />}>
                    <strong className="text-foreground">Sincronizado:</strong> {metaConfig?.totalBMs} BMs,
                    {' '}{metaConfig?.uniqueAccounts} contas únicas e {metaConfig?.totalAccounts} entradas totais.
                  </Callout>
                </div>
              )}

              {mostrarForm && !usandoConfigServidor && (
                <div className="mt-4 space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <input
                    placeholder="Nome da BM (ex.: BM 01 - CONTA PRINCIPAL)"
                    value={novoBM.nome}
                    onChange={(e) => setNovoBM({ ...novoBM, nome: e.target.value })}
                    className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Access Token (EAAB...)"
                    value={novoBM.token}
                    onChange={(e) => setNovoBM({ ...novoBM, token: e.target.value })}
                    className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-xs"
                  />
                  <textarea
                    placeholder="IDs das Ad Accounts — um por linha (ex.: 542086958254702)"
                    value={novoBM.contas}
                    onChange={(e) => setNovoBM({ ...novoBM, contas: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-xs"
                  />
                  <Button variant="primary" onClick={addBM}>
                    <Plus className="h-4 w-4" /> Salvar BM
                  </Button>
                </div>
              )}

              <div className="mt-3 space-y-2">
                {bmsVisiveis.length === 0 && !mostrarForm && (
                  <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted">
                    Nenhuma BM cadastrada. Clique em "Adicionar BM" para começar.
                  </p>
                )}
                {bmsVisiveis.map((bm) => (
                  <BMCard
                    key={bm.id}
                    bm={bm}
                    onChange={(patch) => !usandoConfigServidor && patchBM(bm.id, patch)}
                    onRemove={() =>
                      !usandoConfigServidor && setBms((prev) => prev.filter((b) => b.id !== bm.id))
                    }
                    readonly={usandoConfigServidor}
                  />
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
