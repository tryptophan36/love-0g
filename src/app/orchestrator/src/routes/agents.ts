import { Router } from 'express'
import { randomUUID } from 'crypto'
import type { Agent, AgentProfile, TraitVector } from '../types.js'

const router = Router()

const agentStore: Record<string, Agent> = {}

router.get('/', (_req, res) => {
  res.json(Object.values(agentStore))
})

router.get('/:id', (req, res) => {
  const agent = agentStore[req.params.id]
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  res.json(agent)
})

router.post('/', (req, res) => {
  const {
    // core fields
    id,
    tokenId,
    name,
    traits,
    strategy,
    ogStorageKey,
    owner,
    // new wizard fields
    systemPrompt,
    profile,
    
  } = req.body

  if (!name || !traits) {
    return res.status(400).json({ error: 'Missing required fields: name, traits' })
  }

  const agent: Agent = {
    id:           id ?? randomUUID(),
    tokenId:      tokenId ?? 0,
    name,
    traits:       traits as TraitVector,
    strategy:     strategy ?? 'sincere',
    systemPrompt: systemPrompt ?? '',
    profile:      (profile as AgentProfile) ?? {},
    ogStorageKey: ogStorageKey ?? '',
    owner:        owner ?? '',
    wins:         0,
    losses:       0,
    createdAt:    Date.now(),
  }

  agentStore[agent.id] = agent
  res.status(201).json(agent)
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
