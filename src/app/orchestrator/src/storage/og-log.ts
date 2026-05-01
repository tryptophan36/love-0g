import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk'
import { ethers } from 'ethers'
import type { Match } from '../types.js'

const provider = new ethers.JsonRpcProvider(process.env.OG_RPC_URL!)
const signer   = new ethers.Wallet(process.env.OG_PRIVATE_KEY!, provider)
const indexer  = new Indexer(process.env.OG_INDEXER_RPC!)

export async function appendMatchLog(match: Match): Promise<string> {
  const payload = {
    matchId:   match.id,
    agents:    match.contestants.map(a => ({ id: a.id, name: a.name, tokenId: a.tokenId })),
    messages:  match.messages,
    scores:    match.scores,
    winnerId:  match.winnerId,
    timestamp: Date.now()
  }
  const data = new MemData(new TextEncoder().encode(JSON.stringify(payload)))
  const [rootHash, err] = await indexer.upload(data, process.env.OG_RPC_URL!, signer)
  if (err) throw new Error(`0G Log append failed: ${err}`)
  return rootHash
}