import { supabase } from './supabase'

interface InsightRow {
  spend: string
  date_start: string
}

interface GraphResponse {
  data?: InsightRow[]
  paging?: { next?: string }
  error?: { message: string; code: number }
}

export async function syncFacebookSpend(days = 7) {
  const token = process.env.FB_ACCESS_TOKEN
  const accountId = process.env.FB_AD_ACCOUNT_ID
  const version = process.env.FB_GRAPH_VERSION ?? 'v21.0'

  if (!token || !accountId) {
    return { skipped: true, reason: 'Meta Ads sem credenciais' }
  }

  const until = new Date()
  const since = new Date()
  since.setDate(until.getDate() - Math.max(days - 1, 0))

  const sinceISO = since.toISOString().slice(0, 10)
  const untilISO = until.toISOString().slice(0, 10)

  const params = new URLSearchParams({
    access_token: token,
    level: 'account',
    fields: 'spend',
    time_increment: '1',
    time_range: JSON.stringify({ since: sinceISO, until: untilISO }),
    limit: '500',
  })

  let url = `https://graph.facebook.com/${version}/${accountId}/insights?${params.toString()}`
  const rows: InsightRow[] = []

  while (url) {
    const res = await fetch(url)
    const json = (await res.json()) as GraphResponse

    if (json.error) {
      throw new Error(`Graph API ${json.error.code}: ${json.error.message}`)
    }

    rows.push(...(json.data ?? []))
    url = json.paging?.next ?? ''
  }

  for (const row of rows) {
    const { error } = await supabase.from('daily_metrics').upsert(
      {
        data: row.date_start,
        gasto_anuncios: Number(row.spend ?? 0),
        origem_anuncios: 'sync',
      },
      { onConflict: 'data' },
    )

    if (error) throw error
  }

  return { skipped: false, syncedDays: rows.length }
}
