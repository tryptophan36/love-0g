import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { MatchEngine } from '../engine/matchEngine.js'
import type { Agent, Match } from '../types.js'
import {
  encodeCreateMatchTx,
  encodeJoinMatchTx,
  MATCH_STATUS_OPEN,
  preflightAgentOwnershipForMatchTx,
  readMatchSnapshot,
} from '../chain/matchEscrow.js'

const router = Router()
const activeMatches: Record<string, Match> = {}

/** POST body: { feeWei: string, maxSeats: 2|3, agentId: string } → wallet tx payload for MatchEscrow.createMatch */
router.post('/create', (req, res) => {
  try {
    const feeRaw    = req.body?.feeWei ?? req.body?.fee
    const maxRaw    = req.body?.maxSeats ?? req.body?.maxContestants
    const agentRaw  = req.body?.agentId

    if (feeRaw === undefined || feeRaw === null) {
      res.status(400).json({ error: 'feeWei is required' })
      return
    }
    if (agentRaw === undefined || agentRaw === null) {
      res.status(400).json({ error: 'agentId is required (your iNFT tokenId)' })
      return
    }

    let feeWei: bigint
    try {
      feeWei = BigInt(feeRaw)
    } catch {
      res.status(400).json({ error: 'feeWei must be a valid wei integer' })
      return
    }
    if (feeWei <= BigInt(0)) {
      res.status(400).json({ error: 'feeWei must be positive' })
      return
    }

    let agentId: bigint
    try {
      agentId = BigInt(agentRaw)
    } catch {
      res.status(400).json({ error: 'agentId must be a valid integer' })
      return
    }

    const maxSeats = Number(maxRaw)
    if (maxSeats !== 2 && maxSeats !== 3) {
      res.status(400).json({ error: 'maxSeats must be 2 or 3' })
      return
    }

    const tx = encodeCreateMatchTx(feeWei, maxSeats, agentId)
    res.json(tx)
  } catch (err) {
    console.error('POST /api/matches/create:', err)
    const message = err instanceof Error ? err.message : 'Failed to build create tx'
    res.status(500).json({ error: message })
  }
})

/** POST body: { matchId: string | number, agentId: string | number } → reads fee on-chain, returns tx payload for joinMatch */
router.post('/join', async (req, res) => {
  try {
    const matchIdRaw = req.body?.matchId ?? req.body?.match_id
    const agentRaw   = req.body?.agentId

    if (matchIdRaw === undefined || matchIdRaw === null || matchIdRaw === '') {
      res.status(400).json({ error: 'matchId is required' })
      return
    }
    if (agentRaw === undefined || agentRaw === null || agentRaw === '') {
      res.status(400).json({ error: 'agentId is required (your iNFT tokenId)' })
      return
    }

    let matchId: bigint
    try {
      matchId = BigInt(matchIdRaw)
    } catch {
      res.status(400).json({ error: 'matchId must be an integer' })
      return
    }
    if (matchId <= BigInt(0)) {
      res.status(400).json({ error: 'matchId must be positive' })
      return
    }

    let agentId: bigint
    try {
      agentId = BigInt(agentRaw)
    } catch {
      res.status(400).json({ error: 'agentId must be a valid integer' })
      return
    }

    const sender =
      typeof req.body?.sender === 'string' && req.body.sender.startsWith('0x')
        ? (req.body.sender as string)
        : null

    const preflightErr = await preflightAgentOwnershipForMatchTx(agentId, sender)
    if (preflightErr) {
      res.status(400).json({ error: preflightErr })
      return
    }

    let snapshot
    try {
      snapshot = await readMatchSnapshot(matchId)
    } catch (err) {
      console.error('getMatch:', err)
      res.status(404).json({ error: 'Match not found' })
      return
    }

    if (snapshot.status !== MATCH_STATUS_OPEN) {
      res.status(400).json({
        error: 'Match is not open for joins',
        status: snapshot.status,
        matchId: matchId.toString(),
      })
      return
    }

    const tx = encodeJoinMatchTx(matchId, agentId, snapshot.fee)
    res.json({
      ...tx,
      match: {
        matchId:        matchId.toString(),
        feeWei:         snapshot.fee.toString(),
        status:         snapshot.status,
        seatsTaken:     Number(snapshot.seatsTaken),
        maxContestants: Number(snapshot.maxContestants),
        joinDeadline:   snapshot.joinDeadline.toString(),
        chooser:        snapshot.chooser,
        chooserAgentId: snapshot.chooserAgentId.toString(),
      },
    })
  } catch (err) {
    console.error('POST /api/matches/join:', err)
    const message = err instanceof Error ? err.message : 'Failed to build join tx'
    res.status(500).json({ error: message })
  }
})

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