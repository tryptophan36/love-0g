/** 0G Galileo block explorer (NFT instance pages use `/token/{contract}/instance/{tokenId}`). */
export const EXPLORER_BASE_URL = "https://chainscan-galileo.0g.ai" as const;

const DEFAULT_AGENTIC_ID = "0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F";

/** AgenticID / iNFT — `NEXT_PUBLIC_INFT_CONTRACT` overrides `NEXT_PUBLIC_CONTRACT_ADDRESS`. */
export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_INFT_CONTRACT ||
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  DEFAULT_AGENTIC_ID
) as `0x${string}`;

/** Direct link to this token on 0G Explorer (Galileo / Blockscout-style instance URL). */
export function explorerInftInstanceUrl(tokenId: number): string {
  return `${EXPLORER_BASE_URL}/nft/${CONTRACT_ADDRESS}/${tokenId}`;
}

// 0G Galileo Testnet chain definition
export const zgTestnet = {
  id: 16602,
  name: "0G-Galileo-Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "0G Explorer", url: EXPLORER_BASE_URL },
  },
} as const;
