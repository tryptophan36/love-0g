import { readMatchSnapshot } from '../chain/matchEscrow.js'
import { loadAgentsForOnChainMatch } from '../chain/loadMatchAgents.js'
import type { Match } from '../types.js'
import { kvGet } from './og-kv.js'

const TOTAL_ROUNDS = 4

interface FullLogPayload {
  matchId: string
  agents: Array<{ id: string; name: string; tokenId: number }>
  messages: Match['messages']
  scores: Match['scores']
  winnerId: string | null
  decision: Match['decision']
  timestamp: number
}

/**
 * Rebuild a settled Match from 0G using `logRoot` stored on-chain at settlement.
 * No local files — if the match is not SETTLED or logRoot is empty, returns null.
 */
export async function tryHydrateMatchFromStorage(matchId: string): Promise<Match | null> {
  let onChainId: bigint
  try {
    onChainId = BigInt(matchId)
  } catch {
    return null
  }

  const [snapshot, agents] = await Promise.all([
    readMatchSnapshot(onChainId).catch(() => null),
    loadAgentsForOnChainMatch(onChainId),
  ])

  if (!agents || !snapshot) return null

  const fullLogRoot = snapshot.logRoot?.trim()
  if (!fullLogRoot) return null

  const raw = await kvGet(fullLogRoot)
  if (!raw) return null

  const payload = raw as FullLogPayload
  const sortedScores = [...(payload.scores ?? [])].sort((a, b) => b.total - a.total)
  const winnerScore   = sortedScores[0]
  const runnerUpScore = sortedScores[1]
  const byChooserPick =
    payload.winnerId != null
      ? agents.contestants.find(c => c.id === payload.winnerId)
      : undefined
  const winnerAgent =
    byChooserPick ??
    (winnerScore ? agents.contestants.find(c => c.id === winnerScore.agentId) : undefined)
  const runnerAgent = winnerAgent
    ? agents.contestants.find(c => c.id !== winnerAgent.id)
    : runnerUpScore
      ? agents.contestants.find(c => c.id === runnerUpScore.agentId)
      : undefined

  return {
    id:              matchId,
    onChainMatchId:  matchId,
    contestants:     agents.contestants,
    chooser:         agents.chooser,
    status:          'complete',
    currentRound:    TOTAL_ROUNDS,
    totalRounds:     TOTAL_ROUNDS,
    messages:        payload.messages ?? [],
    scores:          payload.scores ?? [],
    winnerId:        payload.winnerId ?? winnerAgent?.id ?? null,
    winnerTokenId:   winnerAgent?.tokenId ?? null,
    runnerUpTokenId: runnerAgent?.tokenId ?? null,
    decision:        payload.decision ?? null,
    ogLogHash:       fullLogRoot,
    createdAt:
      (payload.timestamp ?? Number(snapshot.createdAt ?? 0) * 1000) || Date.now(),
  }
}
