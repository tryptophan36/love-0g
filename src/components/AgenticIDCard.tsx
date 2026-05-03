"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { agenticIdAbi } from "../lib/abi";
import { explorerInftInstanceUrl } from "@/lib/config";

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function truncateHash(hash: string): string {
  if (!hash || hash.length < 14) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-4)}`;
}

type CardTab = "profile" | "authorize" | "transfer";

const MODEL_COLORS: Record<string, string> = {
  "Model 1": "from-purple-500 to-purple-700",
  "Model 2": "from-blue-500 to-blue-700",
  "Model 3": "from-cyan-500 to-cyan-700",
  "Model 4": "from-green-500 to-green-700",
  "Model 5": "from-orange-500 to-orange-700",
};

interface AgentMeta {
  name: string | null;
  model: string | null;
  capabilities: string[];
}

function parseAgentMeta(
  datas: Array<{ dataDescription: string; dataHash: string }> | undefined
): AgentMeta {
  const meta: AgentMeta = { name: null, model: null, capabilities: [] };
  if (!datas) return meta;
  for (const entry of datas) {
    switch (entry.dataDescription) {
      case "agent_name":
        meta.name = "(hashed)";
        break;
      case "model":
        meta.model = "(hashed)";
        break;
      case "capabilities":
        meta.capabilities = ["(hashed)"];
        break;
    }
  }
  return meta;
}

export default function AgenticIDCard({
  tokenId,
  contractAddress,
  agentMeta,
}: {
  tokenId: bigint;
  contractAddress: `0x${string}`;
  agentMeta?: { name: string; model: string; capabilities: string[] };
}) {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<CardTab>("profile");
  const [recipient, setRecipient] = useState("");
  const [authorizeAddr, setAuthorizeAddr] = useState("");

  // ── Read contract data ──
  const {
    data: owner,
    isLoading: ownerLoading,
    isError: ownerError,
  } = useReadContract({
    address: contractAddress,
    abi: agenticIdAbi,
    functionName: "ownerOf",
    args: [tokenId],
  });

  const { data: creator } = useReadContract({
    address: contractAddress,
    abi: agenticIdAbi,
    functionName: "tokenCreator",
    args: [tokenId],
  });

  const { data: intelligentDatas } = useReadContract({
    address: contractAddress,
    abi: agenticIdAbi,
    functionName: "getIntelligentDatas",
    args: [tokenId],
  });

  const {
    data: authorizedUsers,
    refetch: refetchAuthorized,
  } = useReadContract({
    address: contractAddress,
    abi: agenticIdAbi,
    functionName: "authorizedUsersOf",
    args: [tokenId],
  });

  // ── Transfer ──
  const {
    data: transferHash,
    writeContract: writeTransfer,
    isPending: isTransferPending,
    error: transferError,
    reset: resetTransfer,
  } = useWriteContract();

  const { isLoading: isTransferConfirming, data: transferReceipt } =
    useWaitForTransactionReceipt({ hash: transferHash });

  // ── Authorize Usage ──
  const {
    data: authorizeHash,
    writeContract: writeAuthorize,
    isPending: isAuthorizePending,
    error: authorizeError,
    reset: resetAuthorize,
  } = useWriteContract();

  const { isLoading: isAuthorizeConfirming, data: authorizeReceipt } =
    useWaitForTransactionReceipt({ hash: authorizeHash });

  // ── Revoke Authorization ──
  const {
    data: revokeHash,
    writeContract: writeRevoke,
    isPending: isRevokePending,
    error: revokeError,
    reset: resetRevoke,
  } = useWriteContract();

  const { isLoading: isRevokeConfirming, data: revokeReceipt } =
    useWaitForTransactionReceipt({ hash: revokeHash });

  // Refetch authorized users after authorize/revoke
  useEffect(() => {
    if (
      authorizeReceipt?.status === "success" ||
      revokeReceipt?.status === "success"
    ) {
      refetchAuthorized();
    }
  }, [authorizeReceipt, revokeReceipt, refetchAuthorized]);

  const handleTransfer = () => {
    if (!address || !recipient) return;
    resetTransfer();
    writeTransfer({
      address: contractAddress,
      abi: agenticIdAbi,
      functionName: "transferFrom",
      args: [address as `0x${string}`, recipient as `0x${string}`, tokenId],
    });
  };

  const handleAuthorize = () => {
    if (!authorizeAddr) return;
    resetAuthorize();
    writeAuthorize({
      address: contractAddress,
      abi: agenticIdAbi,
      functionName: "authorizeUsage",
      args: [tokenId, authorizeAddr as `0x${string}`],
    });
    setAuthorizeAddr("");
  };

  const handleRevoke = (user: string) => {
    resetRevoke();
    writeRevoke({
      address: contractAddress,
      abi: agenticIdAbi,
      functionName: "revokeAuthorization",
      args: [tokenId, user as `0x${string}`],
    });
  };

  // ── Loading / Error states ──
  if (ownerLoading) {
    return (
      <div className="og-card p-4 animate-pulse">
        <div className="h-4 bg-og-border rounded w-1/3 mb-3" />
        <div className="h-3 bg-og-border rounded w-1/2" />
      </div>
    );
  }

  if (ownerError) {
    return (
      <div className="og-card p-4">
        <p className="text-sm text-red-400">
          Agent #{tokenId.toString()} not found or does not exist.
        </p>
      </div>
    );
  }

  const datas = intelligentDatas as
    | Array<{ dataDescription: string; dataHash: string }>
    | undefined;
  const parsedMeta = parseAgentMeta(datas);
  const isOwner =
    address &&
    owner &&
    (address as string).toLowerCase() === (owner as string).toLowerCase();

  const authUsers = (authorizedUsers as string[]) || [];

  const displayName =
    agentMeta?.name || parsedMeta.name || `Agent #${tokenId.toString()}`;
  const displayModel = agentMeta?.model || parsedMeta.model;
  const displayCapabilities =
    agentMeta?.capabilities && agentMeta.capabilities.length > 0
      ? agentMeta.capabilities
      : parsedMeta.capabilities;

  const modelGradient = displayModel
    ? MODEL_COLORS[displayModel] || "from-gray-500 to-gray-700"
    : null;

  return (
    <div className="og-card overflow-hidden">
      {/* Card Header */}
      <div className="p-4 pb-3 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[#F5F5F7]">
              {displayName}
            </h3>
            <p className="text-xs text-[#5A5A6E] font-mono">
              ID #{tokenId.toString()}
            </p>
            <a
              href={explorerInftInstanceUrl(Number(tokenId))}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-og-accent hover:underline"
            >
              View on 0G Explorer →
            </a>
          </div>
          {displayModel && (
            <span
              className={`bg-gradient-to-r ${modelGradient} text-white text-xs font-medium px-2.5 py-1 rounded-full`}
            >
              {displayModel}
            </span>
          )}
        </div>

        {/* Capabilities Tags */}
        {displayCapabilities.length > 0 &&
          displayCapabilities[0] !== "(hashed)" && (
            <div className="flex flex-wrap gap-1.5">
              {displayCapabilities.map((cap) => (
                <span
                  key={cap}
                  className="bg-og-purple/10 text-og-text text-xs px-2 py-0.5 rounded-md border border-og-border"
                >
                  {cap}
                </span>
              ))}
            </div>
          )}

        {/* Owner & Creator */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-og-label">Owner</span>
            <span className="text-[#F5F5F7] font-mono text-xs">
              {truncateAddress(owner as string)}
            </span>
          </div>
          {creator && (
            <div className="flex justify-between">
              <span className="text-og-label">Creator</span>
              <span className="text-[#F5F5F7] font-mono text-xs">
                {truncateAddress(creator as string)}
              </span>
            </div>
          )}
          {authUsers.length > 0 && (
            <div className="flex justify-between">
              <span className="text-og-label">Authorized</span>
              <span className="text-og-accent text-xs">
                {authUsers.length} user{authUsers.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* On-Chain Verification */}
      {datas && datas.length > 0 && (
        <div className="px-4 pb-3">
          <details className="group">
            <summary className="text-xs font-medium text-og-label uppercase tracking-wide cursor-pointer hover:text-og-accent transition-colors">
              Verify On-Chain Data
            </summary>
            <div className="mt-2 space-y-1">
              {datas.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs bg-og-dark/50 rounded-lg px-2.5 py-1.5 border border-og-border/50"
                >
                  <span className="text-og-label">
                    {entry.dataDescription}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(entry.dataHash)}
                    title="Click to copy full hash"
                    className="flex items-center gap-1.5 text-[#5A5A6E] font-mono hover:text-og-accent transition-colors cursor-pointer"
                  >
                    {truncateHash(entry.dataHash)}
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Owner Actions */}
      {isOwner && (
        <div className="border-t border-og-border">
          {/* Tab Bar */}
          <div className="flex">
            {(["profile", "authorize", "transfer"] as CardTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? "text-og-accent border-b-2 border-og-accent"
                    : "text-[#5A5A6E] hover:text-og-label"
                }`}
              >
                {tab === "profile"
                  ? "Profile"
                  : tab === "authorize"
                    ? "Authorize"
                    : "Transfer"}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="text-xs text-og-label space-y-2">
                <p>
                  This agent is registered on-chain with{" "}
                  <span className="text-og-accent">{datas?.length || 0}</span>{" "}
                  intelligent data entries.
                </p>
                <p className="text-[#5A5A6E]">
                  Each entry&apos;s hash proves the agent&apos;s configuration
                  hasn&apos;t been tampered with.
                </p>
              </div>
            )}

            {/* Authorize Tab */}
            {activeTab === "authorize" && (
              <div className="space-y-3">
                <p className="text-xs text-og-label">
                  Grant addresses authorization to use this agent. Multiple
                  users can be authorized.
                </p>

                {/* Authorized users list */}
                {authUsers.length > 0 && (
                  <div className="space-y-1.5">
                    {authUsers.map((user) => (
                      <div
                        key={user}
                        className="flex items-center justify-between p-2 bg-og-purple/10 border border-og-accent/30 rounded-og-sm"
                      >
                        <span className="text-xs text-og-accent font-mono">
                          {truncateAddress(user)}
                        </span>
                        <button
                          onClick={() => handleRevoke(user)}
                          disabled={isRevokePending || isRevokeConfirming}
                          className="bg-red-600/80 hover:bg-red-500 rounded-lg px-2.5 py-1 text-xs text-white font-medium transition-all disabled:opacity-50"
                        >
                          {isRevokePending
                            ? "Confirm..."
                            : isRevokeConfirming
                              ? "Revoking..."
                              : "Revoke"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Address to authorize (0x...)"
                    value={authorizeAddr}
                    onChange={(e) => setAuthorizeAddr(e.target.value)}
                    className="flex-1 bg-og-dark border border-og-border rounded-og-sm px-3 py-1.5 text-xs text-[#F5F5F7] placeholder-[#5A5A6E] focus:outline-none focus:border-og-accent font-mono transition-colors"
                  />
                  <button
                    onClick={handleAuthorize}
                    disabled={
                      !authorizeAddr ||
                      isAuthorizePending ||
                      isAuthorizeConfirming
                    }
                    className="og-btn-secondary px-3 py-1.5 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isAuthorizePending
                      ? "Confirm..."
                      : isAuthorizeConfirming
                        ? "Authorizing..."
                        : "Authorize"}
                  </button>
                </div>

                {authorizeReceipt?.status === "success" && (
                  <p className="text-xs text-green-400">
                    Authorization granted.
                  </p>
                )}
                {authorizeError && (
                  <p className="text-xs text-red-400">
                    {(authorizeError as Error).message?.includes(
                      "User rejected"
                    )
                      ? "Rejected by user."
                      : `Error: ${(authorizeError as unknown as { shortMessage?: string }).shortMessage || authorizeError.message}`}
                  </p>
                )}
                {revokeReceipt?.status === "success" && (
                  <p className="text-xs text-green-400">
                    Authorization revoked.
                  </p>
                )}
                {revokeError && (
                  <p className="text-xs text-red-400">
                    {(revokeError as Error).message?.includes("User rejected")
                      ? "Rejected by user."
                      : `Error: ${(revokeError as unknown as { shortMessage?: string }).shortMessage || revokeError.message}`}
                  </p>
                )}
              </div>
            )}

            {/* Transfer Tab */}
            {activeTab === "transfer" && (
              <div className="space-y-3">
                <p className="text-xs text-og-label">
                  Transfer ownership of this agent to another address.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Recipient address (0x...)"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="flex-1 bg-og-dark border border-og-border rounded-og-sm px-3 py-1.5 text-xs text-[#F5F5F7] placeholder-[#5A5A6E] focus:outline-none focus:border-og-accent font-mono transition-colors"
                  />
                  <button
                    onClick={handleTransfer}
                    disabled={
                      !recipient || isTransferPending || isTransferConfirming
                    }
                    className="og-btn-secondary px-3 py-1.5 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isTransferPending
                      ? "Confirm..."
                      : isTransferConfirming
                        ? "Sending..."
                        : "Send"}
                  </button>
                </div>

                {transferReceipt?.status === "success" && (
                  <p className="text-xs text-green-400">Transfer successful.</p>
                )}
                {transferError && (
                  <p className="text-xs text-red-400">
                    {(transferError as Error).message?.includes("User rejected")
                      ? "Rejected by user."
                      : `Error: ${(transferError as unknown as { shortMessage?: string }).shortMessage || transferError.message}`}
                  </p>
                )}
                {transferReceipt?.status === "reverted" && (
                  <p className="text-xs text-red-400">
                    Transfer reverted on-chain.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
