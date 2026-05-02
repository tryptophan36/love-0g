import { Router } from 'express'
import { randomUUID } from 'crypto'
import type { Agent, AgentProfile, TraitVector } from '../types.js'
import { mintAgent, loadAgentsFromChain } from '../chain/agentNFT.js'
import { uploadAgentBlob } from '../storage/og-kv.js'
import { createSigner } from '../config/wallet.js'

const router = Router()

const agentStore: Record<string, Agent> = {}

async function rehydrateFromChain(): Promise<void> {
  const agents = await loadAgentsFromChain()
  for (const agent of agents) {
    agentStore[agent.id] = agent
  }
}

router.get('/', async (_req, res) => {
  try {
    if (Object.keys(agentStore).length === 0) {
      await rehydrateFromChain()
    }
    res.json(Object.values(agentStore))
  } catch (err) {
    console.error('GET /api/agents error:', err)
    res.status(500).json({ error: 'Failed to load agents' })
  }
})

router.get('/:id', async (req, res) => {
  let agent = agentStore[req.params.id]

  if (!agent) {
    // Try rehydrating from chain — id may belong to an agent loaded after restart
    await rehydrateFromChain().catch(() => {})
    agent = agentStore[req.params.id]
  }

  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  res.json(agent)
})

router.post('/', async (req, res) => {
  try {
    const { name, traits, strategy, systemPrompt, profile, owner } = req.body

    if (!name || !traits) {
      return res.status(400).json({ error: 'Missing required fields: name, traits' })
    }

    const agentId  = randomUUID()
    const now      = Date.now()

    // Build the full blob that will live in 0G Storage
    const agentBlob = {
      id:           agentId,
      name,
      traits:       traits as TraitVector,
      strategy:     strategy ?? 'sincere',
      systemPrompt: systemPrompt ?? '',
      profile:      (profile as AgentProfile) ?? {},
      owner:        owner ?? '',
      createdAt:    now,
    }

    // 1. Upload to 0G Storage → storageKey is the rootHash / encryptedURI
    const storageKey = await uploadAgentBlob(agentBlob)
    console.log('storageKey', storageKey)
    // 2. Mint iNFT (computes metadataHash, calls mint + authorizeUsage)
    const signer = createSigner()
    const { tokenId, txHash } = await mintAgent(
      signer,
      { ...agentBlob, wins: 0, losses: 0 },
      storageKey
    )

    // 3. Cache locally for quick in-process lookups
    // On-chain: storageKey is in getIntelligentDatas(tokenId).dataDescription
    // Restart recovery: GET / calls rehydrateFromChain() automatically
    const agent: Agent = {
      ...agentBlob,
      tokenId,
      ogStorageKey: storageKey,
      wins:         0,
      losses:       0,
    }

    agentStore[agentId] = agent

    res.status(201).json({ tokenId, storageKey, txHash })
  } catch (err) {
    console.error('POST /api/agents error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(500).json({ error: message })
  }
})

router.delete('/:id', (req, res) => {
  const agent = agentStore[req.params.id]
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  delete agentStore[req.params.id]
  res.json({ success: true })
})

export function getAgentById(id: string): Agent | undefined {
  return agentStore[id]
}

export function getAllAgents(): Agent[] {
  return Object.values(agentStore)
}

export default router
