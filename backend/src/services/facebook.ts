// ---------------------------------------------------------------------------
// Serviço de integração com a Graph API (Facebook Marketing API).
// Busca o gasto (spend) agregado por dia da conta de anúncios.
//
// [AJUSTAR]: confirme o FB_AD_ACCOUNT_ID, a versão da Graph API e, se precisar,
// adicione filtros por campanha em `params` (ex.: filtering / level=campaign).
// ---------------------------------------------------------------------------

interface InsightRow {
  spend: string
  date_start: string
  date_stop: string
}

interface GraphResponse {
  data: InsightRow[]
  paging?: { next?: string }
  error?: { message: string; code: number; type: string }
}

export interface DailySpend {
  date: string // yyyy-mm-dd
  spend: number
}

const GRAPH = 'https://graph.facebook.com'

/**
 * Retorna o gasto por dia entre `since` e `until` (datas yyyy-mm-dd, no fuso
 * da conta de anúncios). Trata paginação e erros de token.
 */
export async function fetchDailySpend(
  since: string,
  until: string,
): Promise<DailySpend[]> {
  const token = process.env.FB_ACCESS_TOKEN
  const accountId = process.env.FB_AD_ACCOUNT_ID
  const version = process.env.FB_GRAPH_VERSION ?? 'v21.0'

  if (!token || !accountId) {
    throw new Error(
      'FB_ACCESS_TOKEN e FB_AD_ACCOUNT_ID precisam estar definidos no .env',
    )
  }

  const params = new URLSearchParams({
    access_token: token,
    level: 'account',
    fields: 'spend',
    time_increment: '1', // um registro por dia
    time_range: JSON.stringify({ since, until }),
    limit: '500',
  })

  let url = `${GRAPH}/${version}/${accountId}/insights?${params.toString()}`
  const results: DailySpend[] = []

  // Segue a paginação até acabar.
  while (url) {
    const res = await fetch(url)
    const json = (await res.json()) as GraphResponse

    if (json.error) {
      // Token expirado (190) ou rate limit (4, 17, 80000) — propaga para o caller.
      throw new Error(`Graph API erro ${json.error.code}: ${json.error.message}`)
    }

    for (const row of json.data ?? []) {
      results.push({ date: row.date_start, spend: Number(row.spend ?? 0) })
    }

    url = json.paging?.next ?? ''
  }

  return results
}
