import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { webhookRouter } from './routes/webhook.js'
import { apiRouter } from './routes/api.js'
import { scheduleFacebookSync } from './jobs/syncFacebook.js'

const app = express()

app.use(express.json())

// Aceita uma ou várias origens (separadas por vírgula) em FRONTEND_ORIGIN.
const origins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, cb) => {
      // Permite ferramentas sem origin (curl, healthcheck) e as origens da lista.
      if (!origin || origins.includes(origin)) return cb(null, true)
      return cb(null, false)
    },
  }),
)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api', apiRouter)
app.use('/webhook', webhookRouter)

const PORT = Number(process.env.PORT ?? 3333)
app.listen(PORT, () => {
  console.log(`[server] A&J Alpha API ouvindo na porta ${PORT}`)

  // Inicia o cron de sincronização da Meta Ads (somente se o token existir).
  if (process.env.FB_ACCESS_TOKEN) {
    scheduleFacebookSync()
  } else {
    console.warn('[server] FB_ACCESS_TOKEN ausente — sync da Meta Ads desativado.')
  }
})
