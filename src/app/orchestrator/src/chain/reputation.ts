import { ethers } from 'ethers'
import type { Match } from '../types.js'

/** Mirrors `contracts/Reputation.sol` — keep in sync after redeploy */
const ABI = [
  'function recordMatch(string calldata matchId, uint256 winnerAgentId, uint256[] calldata loserAgentIds, uint256 chooserAgentId) external',
  'function matchesPlayed(uint256 tokenId) external view returns (uint256)',
  'function wins(uint256 tokenId) external view returns (uint256)',
  'function getScore(uint256 tokenId) external view returns (int256)',
  'function getStats(uint256 tokenId) external view returns (int256 reputationScore, uint256 played, uint256 winCount)',
] as const

function getReputationContract() {
  const addr = process.env.REPUTATION_CONTRACT?.trim()
  if (!addr?.startsWith('0x')) {
    throw new Error('REPUTATION_CONTRACT is not set in orchestrator .env')
  }
  const provider = new ethers.JsonRpcProvider(process.env.OG_RPC_URL!)
  const signer   = new ethers.Wallet(process.env.OG_PRIVATE_KEY!, provider)
  return new ethers.Contract(addr, ABI, signer)
}

/**
 * After escrow settlement: Reputation contract — winner +10, chooser +10, each loser +5;
 * matchesPlayed incremented for all; wins incremented only for the winning contestant.
 */
export async function updateReputation(match: Match): Promise<void> {
  const contract = getReputationContract()

  const winner = match.contestants.find(a => a.id === match.winnerId)
  if (!winner) {
    console.error(`updateReputation: no contestant matches winnerId=${match.winnerId}`)
    return
  }

  const losers = match.contestants.filter(a => a.id !== match.winnerId)

  await contract.recordMatch(
    match.id,
    winner.tokenId,
    losers.map(l => l.tokenId),
    match.chooser.tokenId,
  )
}

export type OnChainReputationStats = {
  reputationScore: bigint
  matchesPlayed: bigint
  wins: bigint
}

export async function getReputationStats(tokenId: number): Promise<OnChainReputationStats | null> {
  try {
    const contract = getReputationContract()
    const [reputationScore, played, winCount] = await contract.getStats(tokenId)
    return {
      reputationScore,
      matchesPlayed: played,
      wins:          winCount,
    }
  } catch (e) {
    console.error('getReputationStats:', e)
    return null
  }
}
