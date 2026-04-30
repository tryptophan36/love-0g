"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState, useRef, useCallback } from "react";
import { useAccount } from "wagmi";
import MintForm from "../components/MintForm";
import MyAgenticIDs from "../components/MyAgenticIDs";
import { CONTRACT_ADDRESS } from "../lib/config";

export default function Home() {
  const { isConnected } = useAccount();
  const [refreshKey, setRefreshKey] = useState(0);
  const lastMintMetaRef = useRef<{
    name: string;
    model: string;
    capabilities: string[];
  } | null>(null);

  // Map of tokenId -> meta for agents minted in this session (for display names)
  const sessionMetaRef = useRef<
    Map<string, { name: string; model: string; capabilities: string[] }>
  >(new Map());

  const handleMetaChange = useCallback(
    (meta: { name: string; model: string; capabilities: string[] }) => {
      lastMintMetaRef.current = meta;
    },
    []
  );

  const handleMintSuccess = useCallback((tokenId: bigint) => {
    const meta = lastMintMetaRef.current;
    if (meta) {
      sessionMetaRef.current.set(tokenId.toString(), meta);
    }
    // Trigger re-fetch of tokens from contract
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <main className="min-h-screen og-hero-glow">
      {/* Header */}
      <header className="border-b border-og-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight og-gradient-text">
              Agentic ID
            </h1>
            <span className="text-xs text-og-label bg-og-surface px-2 py-0.5 rounded-full border border-og-border">
              ERC-7857
            </span>
          </div>
          <ConnectButton />
        </div>
        <div className="px-6 pb-3 flex items-center gap-2 text-xs">
          <span className="text-[#5A5A6E]">Contract:</span>
          <a
            href={`https://chainscan-galileo.0g.ai/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-og-accent font-mono hover:text-og-light transition-colors"
          >
            {CONTRACT_ADDRESS}
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {!isConnected ? (
          <div className="text-center py-20 space-y-4">
            <h2 className="text-3xl font-semibold og-gradient-text">
              Register AI Agents On-Chain
            </h2>
            <p className="text-og-label text-lg max-w-md mx-auto">
              Connect your wallet to mint intelligent NFTs that represent your AI agents on 0G Chain.
            </p>
            <p className="text-sm text-[#5A5A6E]">
              Make sure you are on 0G-Galileo-Testnet (Chain ID: 16602)
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <MintForm
              contractAddress={CONTRACT_ADDRESS}
              onMintSuccess={handleMintSuccess}
              onMetaChange={handleMetaChange}
            />
            <MyAgenticIDs
              contractAddress={CONTRACT_ADDRESS}
              refreshKey={refreshKey}
              sessionMeta={sessionMetaRef.current}
            />
          </div>
        )}
      </div>
    </main>
  );
}
