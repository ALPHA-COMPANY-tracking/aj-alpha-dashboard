import { supabase } from './supabase.js'

interface InsightRow {
  spend: string
  date_start: string
}

interface GraphResponse {
  data?: InsightRow[]
  paging?: { next?: string }
  error?: { message: string; code: number }
}

interface MetaAdAccountConfig {
  bmName: string
  token: string
  accountId: string
}

function normalizeAccountId(accountId: string) {
  const trimmed = accountId.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('act_') ? trimmed : `act_${trimmed}`
}

function loadMetaAccounts(): MetaAdAccountConfig[] {
  const chunks = [
    process.env.META_AD_ACCOUNTS_JSON_1,
    process.env.META_AD_ACCOUNTS_JSON_2,
    process.env.META_AD_ACCOUNTS_JSON_3,
    process.env.META_AD_ACCOUNTS_JSON_4,
    process.env.META_AD_ACCOUNTS_JSON_5,
  ].filter((chunk): chunk is string => Boolean(chunk))
  const raw = chunks.length > 0 ? chunks.join('') : process.env.META_AD_ACCOUNTS_JSON

  if (raw) {
    const parsed = JSON.parse(raw) as Array<{
      bmName?: string
      name?: string
      token?: string
      accessToken?: string
      accountId?: string
      adAccountId?: string
    }>

    return parsed
      .map((item) => ({
        bmName: item.bmName ?? item.name ?? 'BM Meta',
        token: item.token ?? item.accessToken ?? '',
        accountId: normalizeAccountId(item.accountId ?? item.adAccountId ?? ''),
      }))
      .filter((item) => item.token && item.accountId)
  }

  const token = process.env.FB_ACCESS_TOKEN
  const accountId = process.env.FB_AD_ACCOUNT_ID
  if (!token || !accountId) return []

  return [
    {
      bmName: 'Meta Ads',
      token,
      accountId: normalizeAccountId(accountId),
    },
  ]
}

async function fetchAccountSpend(
  account: MetaAdAccountConfig,
  version: string,
  sinceISO: string,
  untilISO: string,
) {
  const params = new URLSearchParams({
    access_token: account.token,
    level: 'account',
    fields: 'spend',
    time_increment: '1',
    time_range: JSON.stringify({ since: sinceISO, until: untilISO }),
    limit: '500',
  })

  let url = `https://graph.facebook.com/${version}/${account.accountId}/insights?${params.toString()}`
  const rows: InsightRow[] = []

  while (url) {
    const res = await fetch(url)
    const json = (await res.json()) as GraphResponse

    if (json.error) {
      throw new Error(
        `${account.bmName} / ${account.accountId}: Graph API ${json.error.code}: ${json.error.message}`,
      )
    }

    rows.push(...(json.data ?? []))
    url = json.paging?.next ?? ''
  }

  return rows
}

export async function syncFacebookSpend(days = 7) {
  const accounts = loadMetaAccounts()
  const version = process.env.FB_GRAPH_VERSION ?? 'v21.0'

  if (accounts.length === 0) {
    return { skipped: true, reason: 'Meta Ads sem credenciais' }
  }

  const until = new Date()
  const since = new Date()
  since.setDate(until.getDate() - Math.max(days - 1, 0))

  const sinceISO = since.toISOString().slice(0, 10)
  const untilISO = until.toISOString().slice(0, 10)

  const spendByDate = new Map<string, number>()
  const syncedAccountIds = new Set<string>()
  let syncedRows = 0
  const failedAccounts: Array<{ bmName: string; accountId: string; error: string }> = []

  for (const account of accounts) {
    if (syncedAccountIds.has(account.accountId)) continue

    let rows: InsightRow[] = []

    try {
      rows = await fetchAccountSpend(account, version, sinceISO, untilISO)
      syncedRows += rows.length
      syncedAccountIds.add(account.accountId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'erro desconhecido'
      console.error('[meta-sync] falha na conta', {
        bmName: account.bmName,
        accountId: account.accountId,
        error: message,
      })
      failedAccounts.push({
        bmName: account.bmName,
        accountId: account.accountId,
        error: message,
      })
      continue
    }

    for (const row of rows) {
      const current = spendByDate.get(row.date_start) ?? 0
      spendByDate.set(row.date_start, current + Number(row.spend ?? 0))
    }
  }

  for (const [data, spend] of spendByDate) {
    const { error } = await supabase.from('daily_metrics').upsert(
      {
        data,
        gasto_anuncios: Math.round(spend * 100) / 100,
        origem_anuncios: 'sync',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'data' },
    )

    if (error) throw error
  }

  return {
    skipped: false,
    accounts: accounts.map((account) => ({
      bmName: account.bmName,
      accountId: account.accountId,
    })),
    syncedAccounts: accounts.length,
    syncedUniqueAccounts: syncedAccountIds.size,
    failedAccounts,
    syncedRows,
    syncedDays: spendByDate.size,
  }
}
