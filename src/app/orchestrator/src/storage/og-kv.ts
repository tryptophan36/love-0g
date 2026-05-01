import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk'
import { ethers } from 'ethers'
import type { ChooserState, ChooserReaction } from '../types.js'

const RPC_URL    = process.env.OG_RPC_URL!
const INDEXER    = process.env.OG_INDEXER_RPC!
const PRIVATE_KEY = process.env.OG_PRIVATE_KEY!

const provider = new ethers.JsonRpcProvider(RPC_URL)
const signer   = new ethers.Wallet(PRIVATE_KEY, provider)
const indexer  = new Indexer(INDEXER)

// In-memory cache so we don't re-upload identical state
const localCache: Record<string, { hash: string; value: string }> = {}

export async function kvSet(key: string, value: object): Promise<string> {
  const serialized = JSON.stringify(value)

  // Skip upload if value unchanged (saves gas + time during demo)
  if (localCache[key]?.value === serialized) {
    return localCache[key].hash
  }

  const data = new MemData(new TextEncoder().encode(serialized))
  const [rootHash, err] = await indexer.upload(data, RPC_URL, signer)
  if (err) throw new Error(`0G KV set failed for key ${key}: ${err}`)

  localCache[key] = { hash: rootHash, value: serialized }
  return rootHash
}

export async function kvGet(rootHash: string): Promise<object | null> {
  if (!rootHash) return null
  try {
    const buf: Buffer[] = []
    // download to memory
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