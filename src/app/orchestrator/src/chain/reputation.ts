import { ethers } from 'ethers'
import type { Match } from '../types.js'

const ABI = [
  'function recordMatch(string calldata matchId, uint256 winnerId, uint256[] calldata loserIds) external'
]

export async function updateReputation(match: Match): Promise<void> {
  const provider = new ethers.JsonRpcProvider(process.env.OG_RPC_URL!)
  const signer   = new ethers.Wallet(process.env.OG_PRIVATE_KEY!, provider)
  const contract = new ethers.Contract(process.env.REPUTATION_CONTRACT!, ABI, signer)

  const winner  = match.contestants.find(a => a.id === match.winnerId)!
  const losers  = match.contestants.filter(a => a.id !== match.winnerId)

  await contract.recordMatch(
    match.id,
    winner.tokenId,
    losers.map(l => l.tokenId)
  )
}