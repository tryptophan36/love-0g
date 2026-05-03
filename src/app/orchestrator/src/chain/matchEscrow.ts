import { ethers } from 'ethers'
import { createRpcProvider, createSigner } from '../config/wallet.js'

const MATCH_CONTRACT = process.env.MATCH_CONTRACT?.trim()
const MATCH_CHAIN_ID = 16602

const ABI = [
  'function inftContract() external view returns (address)',
  // Write
  'function createMatch(uint8 maxSeats, uint256 agentId) external payable returns (uint256 matchId)',
  'function joinMatch(uint256 matchId, uint256 agentId) external payable',
  'function startMatch(uint256 matchId) external',
  'function failMatch(uint256 matchId) external',
  'function retryMatch(uint256 matchId) external',
  'function settleMatch(uint256 matchId, uint256 winnerAgentId, uint256 runnerUpAgentId, bytes32 proofHash, string calldata logRoot) external',
  // Read
  'function getMatch(uint256 matchId) external view returns (address chooser, uint256 chooserAgentId, uint96 fee, uint32 maxContestants, uint32 seatsTaken, uint64 createdAt, uint64 joinDeadline, uint8 status, bytes32 proofHash, uint256 winnerAgentId, uint256 runnerUpAgentId, string memory logRoot)',
  'function getContestants(uint256 matchId) external view returns (tuple(address wallet, uint256 agentId)[])',
  'function getAgentMatchStatus(uint256 agentId) external view returns (uint256 matchId, uint8 status, uint32 seatsTaken, uint32 maxContestants)',
  'function getAllFullMatches() external view returns (uint256[])',
  'function getAllRunningMatches() external view returns (uint256[])',
  'function agentCurrentMatch(uint256 agentId) external view returns (uint256)',
  // Events
  'event MatchCreated(uint256 indexed matchId, address indexed chooser, uint256 chooserAgentId, uint256 fee, uint256 maxContestants, uint256 joinDeadline)',
  'event MatchJoined(uint256 indexed matchId, address indexed contestant, uint256 agentId, uint32 seatsTaken, uint32 maxContestants)',
  'event MatchFull(uint256 indexed matchId, tuple(address,uint256)[] contestants, address chooser, uint256 chooserAgentId)',
  'event MatchStarted(uint256 indexed matchId)',
  'event MatchFailed(uint256 indexed matchId)',
  'event MatchRetried(uint256 indexed matchId)',
  'event MatchSettled(uint256 indexed matchId, uint256 winnerAgentId, uint256 runnerUpAgentId, bytes32 proofHash, string logRoot)',
]

export const MATCH_STATUS_OPEN    = 0
export const MATCH_STATUS_FULL    = 1
export const MATCH_STATUS_RUNNING = 2
export const MATCH_STATUS_SETTLED = 3
export const MATCH_STATUS_CANCELLED = 4
export const MATCH_STATUS_FAILED  = 5

export interface Contestant {
  wallet:  string
  agentId: bigint
}

function getContractAddress(): string {
  if (!MATCH_CONTRACT?.startsWith('0x')) {
    throw new Error('MATCH_CONTRACT is not set in orchestrator .env')
  }
  return MATCH_CONTRACT
}

function getContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(getContractAddress(), ABI, signerOrProvider)
}

export function encodeCreateMatchTx(feeWei: bigint, maxSeats: number, agentId: bigint) {
  const iface = new ethers.Interface(ABI)
  const to    = getContractAddress()
  const data  = iface.encodeFunctionData('createMatch', [maxSeats, agentId]) as `0x${string}`
  return {
    to: to as `0x${string}`,
    data,
    value:   feeWei.toString(),
    chainId: MATCH_CHAIN_ID,
  }
}

export function encodeJoinMatchTx(matchId: bigint, agentId: bigint, feeWei: bigint) {
  const iface = new ethers.Interface(ABI)
  const to    = getContractAddress()
  const data  = iface.encodeFunctionData('joinMatch', [matchId, agentId]) as `0x${string}`
  return {
    to: to as `0x${string}`,
    data,
    value:   feeWei.toString(),
    chainId: MATCH_CHAIN_ID,
  }
}

/**
 * Same checks as Next.js `preflightAgentOwnershipForMatchTx`: token exists, optional wallet owns it.
 * Returns error message or null (OK / infra failure — allow tx attempt).
 */
export async function preflightAgentOwnershipForMatchTx(
  agentId: bigint,
  sender: string | null,
): Promise<string | null> {
  try {
    const provider = createRpcProvider()
    const escrow = getContract(provider)
    const inftAddr = (await escrow.inftContract()) as string
    const inft = new ethers.Contract(
      inftAddr,
      ['function ownerOf(uint256 tokenId) external view returns (address)'],
      provider,
    )
    let owner: string
    try {
      owner = await inft.ownerOf(agentId)
    } catch {
      return (
        `Agent #${agentId.toString()} does not exist on the iNFT contract (${inftAddr}). ` +
        `Mint an agent first or check the AgenticID contract address.`
      )
    }
    if (sender && owner.toLowerCase() !== sender.toLowerCase()) {
      return (
        `You (${sender}) are not the owner of agent #${agentId.toString()}. ` +
        `Owner is ${owner}. Use one of your own agents.`
      )
    }
    return null
  } catch (probeErr) {
    console.error('agent ownership preflight probe failed:', probeErr)
    return null
  }
}

export async function readMatchSnapshot(matchId: bigint) {
  const provider = createRpcProvider()
  const contract = getContract(provider)
  const row = await contract.getMatch(matchId)
  return {
    chooser:         row.chooser         as string,
    chooserAgentId:  row.chooserAgentId  as bigint,
    fee:             row.fee             as bigint,
    maxContestants:  row.maxContestants  as bigint,
    seatsTaken:      row.seatsTaken      as bigint,
    createdAt:       row.createdAt       as bigint,
    joinDeadline:    row.joinDeadline    as bigint,
    status:          Number(row.status),
    winnerAgentId:   row.winnerAgentId   as bigint,
    runnerUpAgentId: row.runnerUpAgentId as bigint,
    logRoot:         (row.logRoot ?? '')  as string,
  }
}

export async function readMatchContestants(matchId: bigint): Promise<Contestant[]> {
  const provider = createRpcProvider()
  const contract = getContract(provider)
  const rows = await contract.getContestants(matchId)
  return rows.map((r: { wallet: string; agentId: bigint }) => ({
    wallet:  r.wallet,
    agentId: r.agentId,
  }))
}

export async function readAgentMatchStatus(agentId: bigint) {
  const provider = createRpcProvider()
  const contract = getContract(provider)
  const row = await contract.getAgentMatchStatus(agentId)
  return {
    matchId:       row.matchId       as bigint,
    status:        Number(row.status),
    seatsTaken:    Number(row.seatsTaken),
    maxContestants: Number(row.maxContestants),
  }
}

// ─── Orchestrator write functions ──────────────────────────────────────────────

/** Call startMatch on-chain — transitions status FULL → RUNNING */
export async function markMatchRunning(matchId: bigint): Promise<string> {
  const signer   = createSigner()
  const contract = getContract(signer)
  const tx       = await contract.startMatch(matchId)
  const receipt  = await tx.wait()
  return receipt.hash as string
}

/** Call settleMatch on-chain — distributes pot and records proof + 0G log root */
export async function settleMatchOnChain(
  matchId:         bigint,
  winnerAgentId:   bigint,
  runnerUpAgentId: bigint,
  proofHash:       string,
  logRoot:         string,
): Promise<string> {
  const signer   = createSigner()
  const contract = getContract(signer)
  const bytes32  = proofHash.startsWith('0x') ? proofHash : `0x${proofHash}`
  const tx       = await contract.settleMatch(matchId, winnerAgentId, runnerUpAgentId, bytes32, logRoot)
  const receipt  = await tx.wait()
  return receipt.hash as string
}

/** Returns all on-chain matchIds that are currently in FULL status */
export async function getAllFullMatchIds(): Promise<bigint[]> {
  const provider = createRpcProvider()
  const contract = getContract(provider)
  const ids: bigint[] = await contract.getAllFullMatches()
  return ids
}

/** Returns all on-chain matchIds that are currently in RUNNING status */
export async function getAllRunningMatchIds(): Promise<bigint[]> {
  const provider = createRpcProvider()
  const contract = getContract(provider)
  const ids: bigint[] = await contract.getAllRunningMatches()
  return ids
}

/** Transitions a RUNNING match → FAILED (called by orchestrator on engine crash) */
export async function failMatchOnChain(matchId: bigint): Promise<string> {
  const signer   = createSigner()
  const contract = getContract(signer)
  const tx       = await contract.failMatch(matchId)
  const receipt  = await tx.wait()
  return receipt.hash as string
}

/** Transitions a FAILED match → FULL so the scheduler can restart it */
export async function retryMatchOnChain(matchId: bigint): Promise<string> {
  const signer   = createSigner()
  const contract = getContract(signer)
  const tx       = await contract.retryMatch(matchId)
  const receipt  = await tx.wait()
  return receipt.hash as string
}
