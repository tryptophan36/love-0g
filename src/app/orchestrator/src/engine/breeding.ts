import type { Agent, TraitVector } from '../types.js'
import { mintAgent } from '../chain/agentNFT.js'
import { ethers } from 'ethers'

function gaussianNoise(scale = 0.05): number {
  // Box-Muller
  const u = 1 - Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * scale
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function mergeTraits(a: TraitVector, b: TraitVector, bias = 0.5): TraitVector {
  const keys = Object.keys(a) as (keyof TraitVector)[]
  return Object.fromEntries(
    keys.map(k => [
      k,
      clamp(a[k] * bias + b[k] * (1 - bias) + gaussianNoise(0.06))
    ])
  ) as TraitVector
}

export async function breedAgents(
  parentA: Agent,
  parentB: Agent,
  signer: ethers.Signer,
  childName: string
): Promise<Agent> {

  const childTraits = mergeTraits(parentA.traits, parentB.traits)

  // Strategy inherits from higher-scoring parent (simple heuristic)
  const childStrategy = parentA.wins >= parentB.wins
    ? parentA.strategy
    : parentB.strategy

  const childAgent: Omit<Agent, 'tokenId' | 'ogStorageKey'> = {
    id:        crypto.randomUUID(),
    name:      childName,
    traits:    childTraits,
    strategy:  childStrategy,
    owner:     await signer.getAddress(),
    wins:      0,
    losses:    0,
    createdAt: Date.now()
  }

  // Mint new iNFT — passes parentA.tokenId and parentB.tokenId for lineage
  const tokenId = await mintAgent(signer, childAgent, parentA.tokenId, parentB.tokenId)

  return { ...childAgent, tokenId, ogStorageKey: '' }
}