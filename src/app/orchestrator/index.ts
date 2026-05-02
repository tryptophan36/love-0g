import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { config as loadDotenv } from 'dotenv'

function initEnv(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
  ]

  for (const path of candidates) {
    if (existsSync(path)) {
      loadDotenv({ path })
      return
    }
  }

  loadDotenv()
}

initEnv()

const app    = express()
const server = createServer(app)
const io     = new Server(server, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())

// Attach io to req so routes can emit
app.use((req: any, _, next) => { req.io = io; next() })

const { default: agentRoutes } = await import('./src/routes/agents')
const { default: matchRoutes, initScheduler } = await import('./src/routes/matches')

app.use('/api/agents',  agentRoutes)
app.use('/api/matches', matchRoutes)

io.on('connection', (socket) => {
  socket.on('join_match', (matchId: string) => {
    socket.join(`match:${matchId}`)
  })
})

export { io }

server.listen(process.env.PORT ?? 3001, () => {
  console.log(`Orchestrator running on :${process.env.PORT ?? 3001}`)
  initScheduler(io)
})