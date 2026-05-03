import MatchEscrowArtifact from "../../artifacts/contracts/MatchEscrow.sol/MatchEscrow.json";
import {
  createPublicClient,
  decodeEventLog,
  decodeFunctionResult,
  encodeFunctionData,
  http,
  type Abi,
  type Address,
  type TransactionReceipt,
} from "viem";

/** 0G Galileo Testnet — matches hardhat.config.ts zgTestnet */
export const MATCH_CHAIN_ID = 16602;

/** Canonical ABI from compiled contract — stays aligned with `contracts/MatchEscrow.sol`. */
export const matchEscrowAbi = MatchEscrowArtifact.abi as Abi;

/**
 * Older MatchEscrow deployments returned `getMatch` without `chooserAgentId` (10 words vs 11).
 * Same calldata; return blob is 320 bytes instead of 352.
 */
const getMatchLegacyAbi = [
  {
    type: "function",
    name: "getMatch",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [
      { name: "chooser", type: "address" },
      { name: "fee", type: "uint96" },
      { name: "maxContestants", type: "uint32" },
      { name: "seatsTaken", type: "uint32" },
      { name: "createdAt", type: "uint64" },
      { name: "joinDeadline", type: "uint64" },
      { name: "status", type: "uint8" },
      { name: "proofHash", type: "bytes32" },
      { name: "winnerAgentId", type: "uint256" },
      { name: "runnerUpAgentId", type: "uint256" },
    ],
  },
] as const satisfies Abi;

export function getMatchContractAddress(): Address {
  const raw =
    process.env.NEXT_PUBLIC_MATCH_CONTRACT?.trim() ||
    process.env.MATCH_CONTRACT?.trim();
  if (!raw || !raw.startsWith("0x")) {
    throw new Error(
      "MATCH_CONTRACT or NEXT_PUBLIC_MATCH_CONTRACT is not set in .env"
    );
  }
  return raw as Address;
}

export function getMatchRpcUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_ZG_TESTNET_RPC?.trim() ||
    process.env.ZG_TESTNET_RPC?.trim() ||
    process.env.OG_RPC_URL?.trim();
  if (!url) {
    throw new Error(
      "Set OG_RPC_URL, ZG_TESTNET_RPC, or NEXT_PUBLIC_ZG_TESTNET_RPC for match chain reads"
    );
  }
  return url;
}

export function getMatchPublicClient() {
  return createPublicClient({
    chain: {
      id: MATCH_CHAIN_ID,
      name: "0G Galileo Testnet",
      nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
      rpcUrls: { default: { http: [getMatchRpcUrl()] } },
    },
    transport: http(getMatchRpcUrl()),
  });
}

const INFT_OWNER_ABI = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;

/**
 * Verifies the agent token exists on iNFT and that `sender` owns it when provided.
 * Returns an API-facing error string, or null if OK. On RPC infra failure, returns null so the
 * client can still attempt the tx (same behavior as create-match preflight).
 */
export async function preflightAgentOwnershipForMatchTx(params: {
  agentId: bigint;
  sender: Address | null;
}): Promise<string | null> {
  try {
    const client = getMatchPublicClient();
    const matchAddr = getMatchContractAddress();

    const inftAddr = (await client.readContract({
      address: matchAddr,
      abi: matchEscrowAbi,
      functionName: "inftContract",
    })) as Address;

    let owner: Address;
    try {
      owner = (await client.readContract({
        address: inftAddr,
        abi: INFT_OWNER_ABI,
        functionName: "ownerOf",
        args: [params.agentId],
      })) as Address;
    } catch {
      return (
        `Agent #${params.agentId.toString()} does not exist on the iNFT contract (${inftAddr}). ` +
        `Mint an agent first or check the AgenticID contract address.`
      );
    }

    if (params.sender && owner.toLowerCase() !== params.sender.toLowerCase()) {
      return (
        `You (${params.sender}) are not the owner of agent #${params.agentId.toString()}. ` +
        `Owner is ${owner}. Use one of your own agents.`
      );
    }

    return null;
  } catch (probeErr) {
    console.error("agent ownership preflight probe failed:", probeErr);
    return null;
  }
}

export type TxPayload = {
  to: Address;
  data: `0x${string}`;
  value: string;
  chainId: number;
};

export function encodeCreateMatchTx(params: {
  maxSeats: number;
  agentId: bigint;
  feeWei: bigint;
}): TxPayload {
  const to = getMatchContractAddress();
  const data = encodeFunctionData({
    abi: matchEscrowAbi,
    functionName: "createMatch",
    args: [params.maxSeats, params.agentId],
  });
  return {
    to,
    data,
    value: params.feeWei.toString(),
    chainId: MATCH_CHAIN_ID,
  };
}

export function encodeJoinMatchTx(params: {
  matchId: bigint;
  agentId: bigint;
  feeWei: bigint;
}): TxPayload {
  const to = getMatchContractAddress();
  const data = encodeFunctionData({
    abi: matchEscrowAbi,
    functionName: "joinMatch",
    args: [params.matchId, params.agentId],
  });
  return {
    to,
    data,
    value: params.feeWei.toString(),
    chainId: MATCH_CHAIN_ID,
  };
}

/** MatchStatus: OPEN=0, FULL=1, RUNNING=2, SETTLED=3, CANCELLED=4, FAILED=5 */
export const MATCH_STATUS_OPEN = 0;

/** Parses `MatchCreated` from a successful `createMatch` receipt. */
export function extractCreatedMatchIdFromReceipt(
  receipt: TransactionReceipt,
  contractAddress: Address
): bigint | null {
  const target = contractAddress.toLowerCase();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== target) continue;
    try {
      const decoded = decodeEventLog({
        abi: matchEscrowAbi,
        data: log.data,
        topics: log.topics as [signature: `0x${string}`, ...topics: `0x${string}`[]],
      });
      if (decoded.eventName === "MatchCreated") {
        const args = decoded.args as unknown as { matchId: bigint };
        return args.matchId;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ABI for the current deployment (no logRoot — 11 static fields = 352 bytes)
const getMatchNoLogRootAbi = [
  {
    type: "function",
    name: "getMatch",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [
      { name: "chooser",         type: "address"  },
      { name: "chooserAgentId",  type: "uint256"  },
      { name: "fee",             type: "uint96"   },
      { name: "maxContestants",  type: "uint32"   },
      { name: "seatsTaken",      type: "uint32"   },
      { name: "createdAt",       type: "uint64"   },
      { name: "joinDeadline",    type: "uint64"   },
      { name: "status",          type: "uint8"    },
      { name: "proofHash",       type: "bytes32"  },
      { name: "winnerAgentId",   type: "uint256"  },
      { name: "runnerUpAgentId", type: "uint256"  },
    ],
  },
] as const satisfies Abi;

type GetMatchNoLogRootResult = [
  chooser: Address,
  chooserAgentId: bigint,
  fee: bigint,
  maxContestants: number,
  seatsTaken: number,
  createdAt: bigint,
  joinDeadline: bigint,
  status: number,
  proofHash: `0x${string}`,
  winnerAgentId: bigint,
  runnerUpAgentId: bigint,
];

function returnDataByteLength(data: `0x${string}`): number {
  return (data.length - 2) / 2;
}

export async function readMatchOnChain(matchId: bigint) {
  const client = getMatchPublicClient();
  const address = getMatchContractAddress();
  const calldata = encodeFunctionData({
    abi: matchEscrowAbi,
    functionName: "getMatch",
    args: [matchId],
  });
  const { data } = await client.call({ to: address, data: calldata });
  if (!data || data === "0x") {
    throw new Error("getMatch returned empty data");
  }

  const nBytes = returnDataByteLength(data);

  // ≥ 384 bytes: new contract with logRoot (dynamic string adds offset word to head)
  if (nBytes >= 384) {
    const row = decodeFunctionResult({
      abi: matchEscrowAbi,
      functionName: "getMatch",
      data,
    }) as readonly [Address, bigint, bigint, number, number, bigint, bigint, number, `0x${string}`, bigint, bigint, string];
    const [chooser, chooserAgentId, fee, maxContestants, seatsTaken, createdAt, joinDeadline, status, proofHash, winnerAgentId, runnerUpAgentId, logRoot] = row;
    return { chooser, chooserAgentId, fee, maxContestants, seatsTaken, createdAt, joinDeadline, status, proofHash, winnerAgentId, runnerUpAgentId, logRoot };
  }

  // 352 bytes: previous deployment (chooserAgentId present, no logRoot)
  if (nBytes === 352) {
    const row = decodeFunctionResult({
      abi: getMatchNoLogRootAbi,
      functionName: "getMatch",
      data,
    }) as GetMatchNoLogRootResult;
    const [chooser, chooserAgentId, fee, maxContestants, seatsTaken, createdAt, joinDeadline, status, proofHash, winnerAgentId, runnerUpAgentId] = row;
    return { chooser, chooserAgentId, fee, maxContestants, seatsTaken, createdAt, joinDeadline, status, proofHash, winnerAgentId, runnerUpAgentId, logRoot: '' };
  }

  // 320 bytes: oldest legacy deployment (no chooserAgentId, no logRoot)
  if (nBytes === 320) {
    const legacy = decodeFunctionResult({
      abi: getMatchLegacyAbi,
      functionName: "getMatch",
      data,
    }) as readonly [Address, bigint, number, number, bigint, bigint, number, `0x${string}`, bigint, bigint];
    const [chooser, fee, maxContestants, seatsTaken, createdAt, joinDeadline, status, proofHash, winnerAgentId, runnerUpAgentId] = legacy;
    return { chooser, chooserAgentId: BigInt(0), fee, maxContestants, seatsTaken, createdAt, joinDeadline, status, proofHash, winnerAgentId, runnerUpAgentId, logRoot: '' };
  }

  throw new Error(
    `Unexpected getMatch return length (${nBytes} bytes). Redeploy MatchEscrow or update the client ABI.`
  );
}

export type AgentMatchStatus = {
  matchId: bigint;
  status: number;
  seatsTaken: number;
  maxContestants: number;
};

type GetAgentMatchStatusResult = [
  matchId: bigint,
  status: number,
  seatsTaken: number,
  maxContestants: number,
];

/** Returns the active match status for an agent (matchId=0 means not in any match). */
export async function readAgentMatchStatus(agentId: bigint): Promise<AgentMatchStatus> {
  const client = getMatchPublicClient();
  const address = getMatchContractAddress();
  const row = (await client.readContract({
    address,
    abi: matchEscrowAbi,
    functionName: "getAgentMatchStatus",
    args: [agentId],
  })) as GetAgentMatchStatusResult;
  const [matchId, status, seatsTaken, maxContestants] = row;
  return {
    matchId,
    status: Number(status),
    seatsTaken: Number(seatsTaken),
    maxContestants: Number(maxContestants),
  };
}

/** Batch-fetch match status for multiple agents. Returns a map of agentId → status. */
export async function readAgentMatchStatusBatch(
  agentIds: bigint[]
): Promise<Map<string, AgentMatchStatus>> {
  const results = await Promise.allSettled(
    agentIds.map((id) => readAgentMatchStatus(id))
  );
  const map = new Map<string, AgentMatchStatus>();
  agentIds.forEach((id, i) => {
    const r = results[i];
    if (r.status === "fulfilled") {
      map.set(id.toString(), r.value);
    }
  });
  return map;
}
