import { createPublicClient, http } from "viem";

const REPUTATION_ABI = [
  {
    type: "function",
    name: "getStats",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "reputationScore", type: "int256" },
      { name: "played",          type: "uint256" },
      { name: "winCount",        type: "uint256" },
    ],
  },
] as const;

export interface ReputationStats {
  reputationScore: number;
  matchesPlayed:   number;
  wins:            number;
}

function getClient() {
  const rpcUrl = process.env.OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai";
  return createPublicClient({ transport: http(rpcUrl) });
}

export async function getReputationStats(tokenId: number): Promise<ReputationStats | null> {
  const contractAddress = process.env.REPUTATION_CONTRACT?.trim() as `0x${string}` | undefined;
  if (!contractAddress?.startsWith("0x")) return null;

  try {
    const client = getClient();
    const [reputationScore, played, winCount] = await client.readContract({
      address: contractAddress,
      abi:     REPUTATION_ABI,
      functionName: "getStats",
      args:    [BigInt(tokenId)],
    });
    return {
      reputationScore: Number(reputationScore),
      matchesPlayed:   Number(played),
      wins:            Number(winCount),
    };
  } catch {
    return null;
  }
}
