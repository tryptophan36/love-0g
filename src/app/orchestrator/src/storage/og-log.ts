import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk'
import type { Match, Message, ChooserState } from '../types.js'
import { createSigner, getIndexerRpcUrl, getRpcUrl } from '../config/wallet.js'

const rpcUrl = getRpcUrl()
const signer = createSigner()
const indexer = new Indexer(getIndexerRpcUrl())

export async function appendMatchLog(match: Match): Promise<string> {
  const payload = {
    matchId:   match.id,
    agents:    match.contestants.map(a => ({ id: a.id, name: a.name, tokenId: a.tokenId })),
    messages:  match.messages,
    scores:    match.scores,
    winnerId:  match.winnerId,
    decision:  match.decision,
    timestamp: Date.now()
  }
  const data                = new MemData(new TextEncoder().encode(JSON.stringify(payload)))
  const [uploadResult, err] = await indexer.upload(data, rpcUrl, signer)
  if (err) throw new Error(`0G Log append failed: ${err}`)
  return 'rootHash' in uploadResult ? uploadResult.rootHash : uploadResult.rootHashes[0]
}

/** Fire-and-forget round log — called in the background after each round */
export async function appendRoundLog(
  matchId:      string,
  round:        number,
  messages:     Message[],
  chooserState: ChooserState,
): Promise<void> {
  const payload = { matchId, round, messages, chooserState, timestamp: Date.now() }
  const data    = new MemData(new TextEncoder().encode(JSON.stringify(payload)))
  const [, err] = await indexer.upload(data, rpcUrl, signer)
  if (err) console.warn(`0G round log upload failed (match ${matchId} round ${round}): ${err}`)
}