import { loadAgentByTokenId } from './agentNFT.js'
import { readMatchContestants, readMatchSnapshot } from './matchEscrow.js'
import type { Agent } from '../types.js'

export async function loadAgentsForOnChainMatch(onChainMatchId: bigint): Promise<{
  contestants: Agent[]
  chooser: Agent
} | null> {
  const [snapshot, contestantRows] = await Promise.all([
    readMatchSnapshot(onChainMatchId),
    readMatchContestants(onChainMatchId),
  ])

  const [chooser, ...rest] = await Promise.all([
    loadAgentByTokenId(Number(snapshot.chooserAgentId)),
    ...contestantRows.map(c => loadAgentByTokenId(Number(c.agentId))),
  ])

  if (!chooser) {
    console.error(`Could not load chooser agent tokenId=${snapshot.chooserAgentId}`)
    return null
  }

  const contestants = rest.filter((a): a is Agent => a !== null)
  if (contestants.length !== contestantRows.length) {
    console.warn(`Some contestant agents failed to load for match ${onChainMatchId}`)
  }
  if (contestants.length === 0) {
    console.error(`No contestant agents loaded for match ${onChainMatchId}`)
    return null
  }

  return { contestants, chooser }
}
