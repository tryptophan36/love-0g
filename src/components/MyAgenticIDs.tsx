"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import AgenticIDCard from "./AgenticIDCard";
import { agenticIdAbi } from "../lib/abi";

export default function MyAgenticIDs({
  contractAddress,
  refreshKey,
  sessionMeta,
}: {
  contractAddress: `0x${string}`;
  refreshKey: number;
  sessionMeta: Map<string, { name: string; model: string; capabilities: string[] }>;
}) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [ownedTokenIds, setOwnedTokenIds] = useState<bigint[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [manualIds, setManualIds] = useState<bigint[]>([]);
  const [inputId, setInputId] = useState("");

  // Get the user's token balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: contractAddress,
    abi: agenticIdAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Get tokens the user is authorized to use
  const { data: authorizedTokenIds, refetch: refetchAuthorized } = useReadContract({
    address: contractAddress,
    abi: agenticIdAbi,
    functionName: "authorizedTokensOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Fetch all token IDs owned by the user
  useEffect(() => {
    if (!address || !publicClient || balance === undefined) return;

    const count = Number(balance as bigint);
    if (count === 0) {
      setOwnedTokenIds([]);
      return;
    }

    setIsLoadingTokens(true);

    const fetchTokenIds = async () => {
      try {
        const calls = Array.from({ length: count }, (_, i) =>
          publicClient.readContract({
            address: contractAddress,
            abi: agenticIdAbi,
            functionName: "tokenOfOwnerByIndex",
            args: [address, BigInt(i)],
          })
        );
        const ids = (await Promise.all(calls)) as bigint[];
        setOwnedTokenIds(ids);
      } catch {
        setOwnedTokenIds([]);
      } finally {
        setIsLoadingTokens(false);
      }
    };

    fetchTokenIds();
  }, [address, balance, publicClient, contractAddress]);

  // Re-fetch when a new agent is minted
  useEffect(() => {
    if (refreshKey > 0) {
      refetchBalance();
      refetchAuthorized();
    }
  }, [refreshKey, refetchBalance, refetchAuthorized]);

  const handleLoad = () => {
    const trimmed = inputId.trim();
    if (!trimmed) return;
    try {
      const id = BigInt(trimmed);
      const alreadyOwned = ownedTokenIds.some((t) => t === id);
      const alreadyManual = manualIds.some((m) => m === id);
      const alreadyAuthorized = authTokens.some((t) => t === id);
      if (!alreadyOwned && !alreadyManual && !alreadyAuthorized) {
        setManualIds((prev) => [...prev, id]);
      }
      setInputId("");
    } catch {
      // invalid input
    }
  };

  const handleRemoveManual = (id: bigint) => {
    setManualIds((prev) => prev.filter((t) => t !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLoad();
  };

  const authTokens = (authorizedTokenIds as bigint[]) || [];
  const totalAgents = ownedTokenIds.length + authTokens.length + manualIds.length;

  return (
    <div className="og-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold og-gradient-text">My Agents</h2>
        {totalAgents > 0 && (
          <span className="text-xs text-og-text bg-og-purple/10 px-2.5 py-1 rounded-full border border-og-border">
            {totalAgents} agent{totalAgents !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!isConnected ? (
        <p className="text-sm text-[#5A5A6E]">
          Connect your wallet to view your agents.
        </p>
      ) : (
        <>
          {/* Lookup by ID */}
          <div className="space-y-1.5">
            <label className="text-xs text-og-label">
              Look up an agent by Token ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Token ID"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                className="flex-1 min-w-0 bg-og-dark border border-og-border rounded-og-sm px-3 py-2 text-sm text-[#F5F5F7] placeholder-[#5A5A6E] focus:outline-none focus:border-og-accent focus:ring-1 focus:ring-og-accent/30 transition-colors"
              />
              <button
                onClick={handleLoad}
                className="og-btn-secondary px-4 py-2 text-sm font-medium"
              >
                Load
              </button>
            </div>
          </div>

          {isLoadingTokens ? (
            <div className="text-center py-8">
              <p className="text-sm text-og-label">Loading your agents...</p>
            </div>
          ) : totalAgents === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-og-purple/10 border border-og-border flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-og-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.591.659H9.061a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V17a2.25 2.25 0 01-2.25 2.25H7.25A2.25 2.25 0 015 17v-2.5"
                  />
                </svg>
              </div>
              <p className="text-sm text-[#5A5A6E]">
                No agents yet. Register your first AI agent to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Owned agents */}
              {ownedTokenIds.length > 0 && (
                <>
                  <p className="text-xs font-medium text-og-label uppercase tracking-wide">
                    Owned
                  </p>
                  {ownedTokenIds.map((id) => (
                    <AgenticIDCard
                      key={id.toString()}
                      tokenId={id}
                      contractAddress={contractAddress}
                      agentMeta={sessionMeta.get(id.toString())}
                    />
                  ))}
                </>
              )}

              {/* Authorized to me */}
              {authTokens.length > 0 && (
                <>
                  <p className="text-xs font-medium text-og-label uppercase tracking-wide">
                    Authorized to Me
                  </p>
                  {authTokens.map((id) => (
                    <AgenticIDCard
                      key={`auth-${id.toString()}`}
                      tokenId={id}
                      contractAddress={contractAddress}
                    />
                  ))}
                </>
              )}

              {/* Manually loaded agents */}
              {manualIds.length > 0 && (
                <>
                  <p className="text-xs font-medium text-og-label uppercase tracking-wide">
                    Looked Up
                  </p>
                  {manualIds.map((id) => (
                    <div key={`manual-${id.toString()}`} className="relative">
                      <button
                        onClick={() => handleRemoveManual(id)}
                        className="absolute top-2 right-2 text-xs text-[#5A5A6E] hover:text-og-accent transition-colors z-10"
                      >
                        Dismiss
                      </button>
                      <AgenticIDCard
                        tokenId={id}
                        contractAddress={contractAddress}
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
