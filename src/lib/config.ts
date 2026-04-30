// AgenticID contract address — set NEXT_PUBLIC_CONTRACT_ADDRESS to use your own, or defaults to pre-deployed Galileo Testnet
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F") as `0x${string}`;

// 0G Galileo Testnet chain definition
export const zgTestnet = {
  id: 16602,
  name: "0G-Galileo-Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "0G Explorer", url: "https://chainscan-galileo.0g.ai" },
  },
} as const;
