import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk'
import type { ChooserState, ChooserReaction } from '../types.js'
import { createSigner, getIndexerRpcUrl, getRpcUrl } from '../config/wallet.js'

const RPC_URL = getRpcUrl()
const signer = createSigner()
const indexer = new Indexer(getIndexerRpcUrl())

// In-memory cache so we don't re-upload identical state
const localCache: Record<string, { hash: string; value: string }> = {}

export async function kvSet(key: string, value: object): Promise<string> {
  const serialized = JSON.stringify(value)

  // Skip upload if value unchanged (saves gas + time during demo)
  if (localCache[key]?.value === serialized) {
    return localCache[key].hash
  }

  const data                = new MemData(new TextEncoder().encode(serialized))
  const [uploadResult, err] = await indexer.upload(data, RPC_URL, signer)
  if (err) throw new Error(`0G KV set failed for key ${key}: ${err}`)
  const rootHash = 'rootHash' in uploadResult ? uploadResult.rootHash : uploadResult.rootHashes[0]
  console.log('rootHash', rootHash)
  localCache[key] = { hash: rootHash, value: serialized }
  return rootHash
}

export async function kvGet(rootHash: string): Promise<object | null> {
  if (!rootHash) return null
  try {
    const tmpPath = `/tmp/og-${Date.now()}`
    const err = await indexer.download(rootHash, tmpPath, true)
    if (err) throw err
    const fs = await import('fs')
    const raw = fs.readFileSync(tmpPath, 'utf8')
    fs.unlinkSync(tmpPath)
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// Raw blob upload — used when you need the rootHash as an encryptedURI for minting
export async function uploadAgentBlob(payload: object): Promise<string> {
  const data                = new MemData(new TextEncoder().encode(JSON.stringify(payload)))
  const [uploadResult, err] = await indexer.upload(data, RPC_URL, signer)
  if (err) throw new Error(`0G Storage upload failed: ${err}`)
  return 'rootHash' in uploadResult ? uploadResult.rootHash : uploadResult.rootHashes[0]
}

// Convenience: write chooser state, return new root hash
export async function writeChooserState(
  matchId: string,
  state: ChooserState
): Promise<string> {
  return kvSet(`match:${matchId}:chooser_state`, state)
}

// Convenience: read chooser state for a specific agent
export async function readChooserReaction(
  stateHash: string,
  agentId: string
): Promise<ChooserReaction | null> {
  if (!stateHash) return null
  const state = await kvGet(stateHash) as ChooserState | null
  return state?.reactions?.[agentId] ?? null
}

// Convenience: read the full chooser state object
export async function readChooserState(stateHash: string): Promise<ChooserState | null> {
  if (!stateHash) return null
  return (await kvGet(stateHash)) as ChooserState | null
}

// Write initial match metadata to 0G KV — marks match as started before engine runs
export async function initMatchKV(
  matchId: string,
  contestantIds: string[],
  chooserId: string,
): Promise<string> {
  return kvSet(`match:${matchId}:meta`, {
    matchId,
    status:       'starting',
    contestantIds,
    chooserId,
    startedAt:    Date.now(),
  })
}