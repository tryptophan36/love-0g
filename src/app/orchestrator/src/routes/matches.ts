import { Router } from 'express'
import { Server as SocketServer } from 'socket.io'
import { MatchEngine } from '../engine/matchEngine.js'
import type { Match } from '../types.js'
import {
  encodeCreateMatchTx,
  encodeJoinMatchTx,
  MATCH_STATUS_OPEN,
  MATCH_STATUS_FULL,
  preflightAgentOwnershipForMatchTx,
  readMatchSnapshot,
  markMatchRunning,
  getAllFullMatchIds,
  getAllRunningMatchIds,
  failMatchOnChain,
} from '../chain/matchEscrow.js'
import { loadAgentsForOnChainMatch } from '../chain/loadMatchAgents.js'
import { initMatchKV } from '../storage/og-kv.js'
import { tryHydrateMatchFromStorage } from '../storage/hydrate-match.js'

const router = Router()

// ─── State ──────────────────────────────────────────────────────────────────────
const runningMatches = new Set<string>()
const activeMatches: Record<string, Match> = {}

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function startMatchFlow(onChainMatchId: bigint, io: SocketServer): Promise<void> {
  const matchKey = onChainMatchId.toString()

  // ── Guard: skip if already running ──
  if (runningMatches.has(matchKey)) return
  runningMatches.add(matchKey)

  try {
    // ── Load agent configs from 0G Storage ──
    const agents = await loadAgentsForOnChainMatch(onChainMatchId)
    if (!agents) {
      runningMatches.delete(matchKey)
      return
    }

    // ── Mark RUNNING on-chain (FULL → RUNNING) ──
    await markMatchRunning(onChainMatchId)

    // ── Build in-memory match object ──
    const match: Match = {
      id:              matchKey,
      onChainMatchId:  matchKey,
      contestants:     agents.contestants,
      chooser:         agents.chooser,
      status:          'pending',
      currentRound:    0,
      totalRounds:     4,
      messages:        [],
      scores:          [],
      winnerId:        null,
      winnerTokenId:   null,
      runnerUpTokenId: null,
      decision:        null,
      ogLogHash:       null,
      createdAt:       Date.now(),
    }
    activeMatches[matchKey] = match

    // ── Init 0G KV keys ──
    await initMatchKV(
      matchKey,
      agents.contestants.map(c => c.id),
      agents.chooser.id,
    ).catch(err => console.warn('initMatchKV failed (non-fatal):', err))

    // ── Emit match_started ──
    io.to(`match:${matchKey}`).emit('match_started', {
      matchId: matchKey,
      contestants: agents.contestants.map(a => ({
        id: a.id,
        name: a.name,
        tokenId: a.tokenId,
        traits: a.traits,
        profile: a.profile,
      })),
      chooser: {
        id: agents.chooser.id,
        name: agents.chooser.name,
        tokenId: agents.chooser.tokenId,
        traits: agents.chooser.traits,
        profile: agents.chooser.profile,
      },
    })

    // ── Wire engine events → Socket.io room ──
    const engine = new MatchEngine(match)

    const fwd = (event: string) =>
      engine.on(event, (data) => io.to(`match:${matchKey}`).emit(event, data))

    fwd('status')
    fwd('round_start')
    fwd('message')
    fwd('chooser_message')
    fwd('chooser_state')
    fwd('chooser_decision')
    fwd('complete')

    // ── Run — async, don't block the HTTP handler / scheduler ──
    engine.run()
      .then(() => { runningMatches.delete(matchKey) })
      .catch(err => {
        console.error(`Match engine error for ${matchKey}:`, err)
        runningMatches.delete(matchKey)
        failMatchOnChain(BigInt(matchKey)).catch(e =>
          console.error(`failMatchOnChain failed for ${matchKey}:`, e)
        )
      })

  } catch (err) {
    console.error(`startMatchFlow failed for ${matchKey}:`, err)
    runningMatches.delete(matchKey)
    throw err
  }
}

/**
 * Resume a match that is already RUNNING on-chain (e.g. after process restart).
 * Skips markMatchRunning. Retries the engine once — if it fails again, marks FAILED.
 */
async function resumeMatchFlow(onChainMatchId: bigint, io: SocketServer): Promise<void> {
  const matchKey = onChainMatchId.toString()
  if (runningMatches.has(matchKey)) return
  runningMatches.add(matchKey)

  try {
    const agents = await loadAgentsForOnChainMatch(onChainMatchId)
    if (!agents) {
      runningMatches.delete(matchKey)
      return
    }

    const match: Match = {
      id:              matchKey,
      onChainMatchId:  matchKey,
      contestants:     agents.contestants,
      chooser:         agents.chooser,
      status:          'pending',
      currentRound:    0,
      totalRounds:     4,
      messages:        [],
      scores:          [],
      winnerId:        null,
      winnerTokenId:   null,
      runnerUpTokenId: null,
      decision:        null,
      ogLogHash:       null,
      createdAt:       Date.now(),
    }
    activeMatches[matchKey] = match

    const engine = new MatchEngine(match)
    const fwd = (event: string) =>
      engine.on(event, (data) => io.to(`match:${matchKey}`).emit(event, data))

    fwd('status'); fwd('round_start'); fwd('message')
    fwd('chooser_message'); fwd('chooser_state'); fwd('chooser_decision'); fwd('complete')

    engine.run()
      .then(() => { runningMatches.delete(matchKey) })
      .catch(err => {
        console.error(`Resume failed for match ${matchKey}:`, err)
        runningMatches.delete(matchKey)
        // One retry exhausted — mark FAILED on-chain
        failMatchOnChain(BigInt(matchKey)).catch(e =>
          console.error(`failMatchOnChain (after resume) failed for ${matchKey}:`, e)
        )
      })

  } catch (err) {
    console.error(`resumeMatchFlow failed for ${matchKey}:`, err)
    runningMatches.delete(matchKey)
    failMatchOnChain(BigInt(matchKey)).catch(console.error)
  }
}

// ─── Scheduler ──────────────────────────────────────────────────────────────────

const FIVE_MINUTES_MS = 5 * 60 * 1000

export function initScheduler(io: SocketServer): void {
  async function poll() {
    try {
      // ── 1. Handle RUNNING matches not tracked by this process ─────────────
      // Could be a process restart or a match that slipped through.
      // Policy: if created within last 5 min → retry once via resumeMatchFlow.
      //         if older → stuck, mark FAILED immediately.
      const runningIds = await getAllRunningMatchIds()
      
      for (const matchId of runningIds) {
        const matchKey = matchId.toString()
        if (runningMatches.has(matchKey)) continue

        try {
          const snapshot = await readMatchSnapshot(matchId)
          const ageMs = Date.now() - Number(snapshot.createdAt) * 1000

          if (ageMs <= FIVE_MINUTES_MS) {
            console.log(`Retrying recent RUNNING match ${matchKey} (age ${Math.round(ageMs / 1000)}s)`)
            resumeMatchFlow(matchId, io).catch(console.error)
          } else {
            console.log(`Failing stuck RUNNING match ${matchKey} (age ${Math.round(ageMs / 1000)}s)`)
            await failMatchOnChain(matchId)
          }
        } catch (err) {
          console.error(`Error handling stuck RUNNING match ${matchKey}:`, err)
        }
      }

      // ── 2. Start any FULL matches (normal path) ────────────────────────────
      const fullIds = await getAllFullMatchIds()
      console.log('fullIds', fullIds)
      for (const matchId of fullIds) {
        if (!runningMatches.has(matchId.toString())) {
          startMatchFlow(matchId, io).catch(console.error)
        }
      }
    } catch (err) {
      console.error('Match scheduler poll error:', err)
    }
  }

  // First poll immediately, then every hour
  poll()
  setInterval(poll, 3_600_000)
  console.log('Match scheduler started (1h interval)')
}

// ─── Routes ─────────────────────────────────────────────────────────────────────

/** POST body: { feeWei: string, maxSeats: 1|2|3, agentId: string } → wallet tx payload */
router.post('/create', (req, res) => {
  try {
    const feeRaw   = req.body?.feeWei ?? req.body?.fee
    const maxRaw   = req.body?.maxSeats ?? req.body?.maxContestants
    const agentRaw = req.body?.agentId

    if (feeRaw === undefined || feeRaw === null) {
      res.status(400).json({ error: 'feeWei is required' }); return
    }
    if (agentRaw === undefined || agentRaw === null) {
      res.status(400).json({ error: 'agentId is required (your iNFT tokenId)' }); return
    }

    let feeWei: bigint
    try { feeWei = BigInt(feeRaw) } catch {
      res.status(400).json({ error: 'feeWei must be a valid wei integer' }); return
    }
    if (feeWei <= BigInt(0)) {
      res.status(400).json({ error: 'feeWei must be positive' }); return
    }

    let agentId: bigint
    try { agentId = BigInt(agentRaw) } catch {
      res.status(400).json({ error: 'agentId must be a valid integer' }); return
    }

    const maxSeats = Number(maxRaw)
    if (maxSeats !== 1 && maxSeats !== 2 && maxSeats !== 3) {
      res.status(400).json({ error: 'maxSeats must be 1, 2, or 3' }); return
    }

    res.json(encodeCreateMatchTx(feeWei, maxSeats, agentId))
  } catch (err) {
    console.error('POST /api/matches/create:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to build create tx' })
  }
})

/** POST body: { matchId, agentId } → join tx payload */
router.post('/join', async (req, res) => {
  try {
    const matchIdRaw = req.body?.matchId ?? req.body?.match_id
    const agentRaw   = req.body?.agentId

    if (!matchIdRaw) { res.status(400).json({ error: 'matchId is required' }); return }
    if (!agentRaw)   { res.status(400).json({ error: 'agentId is required' }); return }

    let matchId: bigint
    try { matchId = BigInt(matchIdRaw) } catch {
      res.status(400).json({ error: 'matchId must be an integer' }); return
    }
    if (matchId <= BigInt(0)) { res.status(400).json({ error: 'matchId must be positive' }); return }

    let agentId: bigint
    try { agentId = BigInt(agentRaw) } catch {
      res.status(400).json({ error: 'agentId must be a valid integer' }); return
    }

    const sender =
      typeof req.body?.sender === 'string' && req.body.sender.startsWith('0x')
        ? (req.body.sender as string)
        : null

    const preflightErr = await preflightAgentOwnershipForMatchTx(agentId, sender)
    if (preflightErr) { res.status(400).json({ error: preflightErr }); return }

    let snapshot
    try {
      snapshot = await readMatchSnapshot(matchId)
    } catch {
      res.status(404).json({ error: 'Match not found' }); return
    }

    if (snapshot.status !== MATCH_STATUS_OPEN) {
      res.status(400).json({ error: 'Match is not open for joins', status: snapshot.status }); return
    }

    res.json({
      ...encodeJoinMatchTx(matchId, agentId, snapshot.fee),
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
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to build join tx' })
  }
})

/**
 * POST /start — triggered by frontend on MatchFull event.
 * Body: { matchId: string | number }   (on-chain matchId)
 */
router.post('/start', async (req, res) => {
  const io = (req as unknown as { io: SocketServer }).io
  const raw = req.body?.matchId ?? req.body?.match_id
  if (raw === undefined || raw === null) {
    res.status(400).json({ error: 'matchId is required' }); return
  }

  let onChainMatchId: bigint
  try { onChainMatchId = BigInt(raw) } catch {
    res.status(400).json({ error: 'matchId must be a valid integer' }); return
  }

  const matchKey = onChainMatchId.toString()

  // Verify the match is FULL on-chain before accepting the request
  let snapshot
  try {
    snapshot = await readMatchSnapshot(onChainMatchId)
  } catch {
    res.status(404).json({ error: 'Match not found on-chain' }); return
  }

  if (snapshot.status !== MATCH_STATUS_FULL && snapshot.status !== MATCH_STATUS_OPEN) {
    // Already running / settled / cancelled — but return success if it's already running
    if (runningMatches.has(matchKey) || activeMatches[matchKey]) {
      res.json({ matchId: matchKey, alreadyRunning: true }); return
    }
    res.status(400).json({
      error:  'Match is not in FULL status',
      status: snapshot.status,
    }); return
  }

  // Kick off asynchronously — respond immediately
  startMatchFlow(onChainMatchId, io).catch(console.error)

  res.json({ matchId: matchKey, started: true })
})

router.get('/:id', async (req, res) => {
  const id = req.params.id
  const live = activeMatches[id]
  if (live) {
    res.json(live)
    return
  }

  const rehydrated = await tryHydrateMatchFromStorage(id)
  if (rehydrated) {
    if (rehydrated.status === 'complete') activeMatches[id] = rehydrated
    res.json(rehydrated)
    return
  }

  res.status(404).json({ error: 'Match not found or not yet started' })
})

export default router
