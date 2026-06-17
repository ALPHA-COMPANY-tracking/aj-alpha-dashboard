import cron from 'node-cron'
import { prisma } from '../db.js'
import { fetchDailySpend } from '../services/facebook.js'

// ---------------------------------------------------------------------------
// Job agendado: a cada ~15 min busca o gasto dos últimos 3 dias e grava na
// tabela daily_metrics (upsert por data). Janela de 3 dias cobre ajustes
// retroativos que a Meta às vezes faz no spend do dia anterior.
// ---------------------------------------------------------------------------

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function runFacebookSync(): Promise<void> {
  const until = new Date()
  const since = new Date()
  since.setDate(since.getDate() - 3)

  try {
    const rows = await fetchDailySpend(ymd(since), ymd(until))

    for (const { date, spend } of rows) {
      await prisma.dailyMetric.upsert({
        where: { data: new Date(date) },
        create: {
          data: new Date(date),
          gastoAnuncios: spend,
          origemAnuncios: 'sync',
        },
        update: {
          // Só sobrescreve se a linha não foi editada manualmente.
          gastoAnuncios: spend,
        },
      })
    }
    console.log(`[fb-sync] ${rows.length} dia(s) sincronizado(s) às ${new Date().toISOString()}`)
  } catch (err) {
    console.error('[fb-sync] falha:', (err as Error).message)
  }
}

/** Registra o cron (a cada 15 minutos) e roda uma vez no boot. */
export function scheduleFacebookSync(): void {
  cron.schedule('*/15 * * * *', runFacebookSync, {
    timezone: process.env.FB_ACCOUNT_TIMEZONE ?? 'America/Sao_Paulo',
  })
  // Sincroniza imediatamente ao subir o servidor.
  void runFacebookSync()
}
