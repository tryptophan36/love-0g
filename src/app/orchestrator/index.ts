import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import agentRoutes from './src/routes/agents.ts'
import matchRoutes from './src/routes/matches.ts'

const app    = express()
const server = createServer(app)
const io     = new Server(server, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())

// Attach io to req so routes can emit
app.use((req: any, _, next) => { req.io = io; next() })

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
})