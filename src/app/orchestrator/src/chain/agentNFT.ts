import { ethers } from 'ethers'
import type { Agent } from '../types.js'
import { kvGet } from '../storage/og-kv.js'
import { createSigner } from '../config/wallet.js'

const CONTRACT = process.env.INFT_CONTRACT!

const ABI = [
  'function iMintWithRole(address to, tuple(string dataDescription, bytes32 dataHash)[] datas, address _creator) external returns (uint256)',
  'function authorizeUsage(uint256 tokenId, address user) external',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function authorizedTokensOf(address user) external view returns (uint256[])',
  'function getIntelligentDatas(uint256 tokenId) external view returns (tuple(string dataDescription, bytes32 dataHash)[])',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'function tokenURI(uint256 tokenId) external view returns (string)'
]

function getContract(signer: ethers.Signer) {
  return new ethers.Contract(CONTRACT, ABI, signer)
}

export async function mintAgent(
  signer: ethers.Signer,
  agent: Omit<Agent, 'tokenId' | 'ogStorageKey'>,
  storageKey: string,
  parentATokenId?: number,
  parentBTokenId?: number
): Promise<{ tokenId: number; txHash: string }> {

  const contract = getContract(signer)

  // Include storageKey in the hash so on-chain proof covers the stored blob
  const intelligenceData = {
    traitVector:  agent.traits,
    strategy:     ethers.keccak256(ethers.toUtf8Bytes(agent.strategy)),
    imageUrl:     agent.profile?.imageUrl ?? '',
    parentA:      parentATokenId ?? null,
    parentB:      parentBTokenId ?? null,
    createdAt:    agent.createdAt,
    storageKey,
  }

  const metadataHash = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(intelligenceData))
  )

  const signerAddress = await signer.getAddress()

  // Mint to the user's wallet so they are the true on-chain owner.
  // Fall back to orchestrator if no valid owner wallet was provided.
  const ownerAddress = agent.owner?.trim()
  const mintTo =
    ownerAddress && ethers.isAddress(ownerAddress) ? ownerAddress : signerAddress

  // IntelligentData: storageKey (0G root hash) as dataDescription, metadataHash as dataHash
  const datas = [{ dataDescription: storageKey, dataHash: metadataHash }]

  const tx      = await contract.iMintWithRole(mintTo, datas, signerAddress)
  const receipt = await tx.wait()

  // Parse tokenId from Transfer event
  const iface   = new ethers.Interface(ABI)
  const log     = receipt.logs.find((l: ethers.Log) => {
    try { iface.parseLog(l); return true } catch { return false }
  })
  const parsed  = iface.parseLog(log)
  const tokenId = Number(parsed?.args[2] ?? 0)

  // Authorize the orchestrator so loadAgentsFromChain() can still find and manage this agent.
  // AgenticID.authorizeUsage now accepts OPERATOR_ROLE callers, so the orchestrator
  // can self-authorize even though the user owns the NFT.
  if (mintTo.toLowerCase() !== signerAddress.toLowerCase()) {
    await contract.authorizeUsage(tokenId, signerAddress)
  }

  return { tokenId, txHash: receipt.hash }
}

export async function loadAgentByTokenId(tokenId: number): Promise<Agent | null> {
  const signer   = createSigner()
  const contract = getContract(signer)
  try {
    const datas      = await contract.getIntelligentDatas(tokenId)
    const storageKey = datas[0]?.dataDescription as string | undefined
    if (!storageKey) return null

    const blob = await kvGet(storageKey) as Partial<Agent> | null
    if (!blob) return null

    return {
      ...blob,
      tokenId,
      ogStorageKey: storageKey,
      wins:   blob.wins   ?? 0,
      losses: blob.losses ?? 0,
    } as Agent
  } catch {
    return null
  }
}

export async function loadAgentsFromChain(): Promise<Agent[]> {
  const signer = createSigner()
  const contract = getContract(signer)
  const signerAddress = await signer.getAddress()

  const tokenIds: bigint[] = await contract.authorizedTokensOf(signerAddress)
  if (!tokenIds.length) return []

  const agents = await Promise.all(
    tokenIds.map(async (tokenIdBig) => {
      const tokenId = Number(tokenIdBig)
      try {
        const datas = await contract.getIntelligentDatas(tokenId)
        const storageKey: string = datas[0]?.dataDescription
        if (!storageKey) return null

        const blob = await kvGet(storageKey) as Partial<Agent> | null
        if (!blob) return null

        return {
          ...blob,
          tokenId,
          ogStorageKey: storageKey,
          wins:   blob.wins   ?? 0,
          losses: blob.losses ?? 0,
        } as Agent
      } catch {
        return null
      }
    })
  )

  return agents.filter((a): a is Agent => a !== null)
}