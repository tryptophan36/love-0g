import { ethers } from 'ethers'
import type { Agent } from '../types.js'

const CONTRACT  = process.env.INFT_CONTRACT!
const RPC_URL   = process.env.OG_RPC_URL!

// Minimal ABI — only what we call
const ABI = [
  'function mint(address to, string calldata encryptedURI, bytes32 metadataHash) external returns (uint256)',
  'function authorizeUsage(uint256 tokenId, address executor, bytes calldata permissions) external',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
]

function getContract(signer: ethers.Signer) {
  return new ethers.Contract(CONTRACT, ABI, signer)
}

export async function mintAgent(
  signer: ethers.Signer,
  agent: Omit<Agent, 'tokenId' | 'ogStorageKey'>,
  parentATokenId?: number,
  parentBTokenId?: number
): Promise<number> {

  const contract = getContract(signer)

  const intelligenceData = {
    traitVector:  agent.traits,
    strategy:     ethers.keccak256(ethers.toUtf8Bytes(agent.strategy)), // hash only
    parentA:      parentATokenId ?? null,
    parentB:      parentBTokenId ?? null,
    createdAt:    agent.createdAt
  }

  const metadataHash = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(intelligenceData))
  )

  // encryptedURI = 0G Storage root hash of full agent config
  // For hackathon: store as plain JSON, treat root hash as URI
  const encryptedURI = `0g://agent-${agent.id}`

  const tx      = await contract.mint(await signer.getAddress(), encryptedURI, metadataHash)
  const receipt = await tx.wait()

  // Parse tokenId from Transfer event
  const iface    = new ethers.Interface(ABI)
  const log      = receipt.logs.find((l: any) => {
    try { iface.parseLog(l); return true } catch { return false }
  })
  const parsed   = iface.parseLog(log)
  const tokenId  = Number(parsed?.args[2] ?? 0)

  // Authorize orchestrator wallet to run this agent in matches
  const orchestratorAddress = await signer.getAddress()
  await contract.authorizeUsage(
    tokenId,
    orchestratorAddress,
    ethers.toUtf8Bytes('run-in-match')
  )

  return tokenId
}