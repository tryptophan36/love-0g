import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { MatchEngine } from '../engine/matchEngine.js'
import type { Agent, Match } from '../types.js'

const router = Router()
const activeMatches: Record<string, Match> = {}

router.post('/start', async (req: any, res) => {
  const { contestantIds, chooserId } = req.body
  // TODO: load agents from your DB / 0G Storage by ID

  const match: Match = {
    id:           uuid(),
    contestants:  [],   // populate from contestantIds
    chooser:      {} as Agent,
    status:       'pending',
    currentRound: 0,
    totalRounds:  4,
    messages:     [],
    scores:       [],
    winnerId:     null,
    ogLogHash:    null,
    createdAt:    Date.now()
  }

  activeMatches[match.id] = match

  const engine = new MatchEngine(match)
  const io     = req.io

  // Forward all engine events to the match's socket room
  engine.on('message',       (data) => io.to(`match:${match.id}`).emit('message', data))
  engine.on('chooser_state', (data) => io.to(`match:${match.id}`).emit('chooser_state', data))
  engine.on('status',        (data) => io.to(`match:${match.id}`).emit('status', data))
  engine.on('complete',      (data) => io.to(`match:${match.id}`).emit('complete', data))

  // Run async — don't await in the HTTP handler
  engine.run().catch(console.error)

  res.json({ matchId: match.id })
})

router.get('/:id', (req, res) => {
  const match = activeMatches[req.params.id]
  if (!match) return res.status(404).json({ error: 'Match not found' })
  res.json(match)
})

export default router