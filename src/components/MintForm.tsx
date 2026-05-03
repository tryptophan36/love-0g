"use client";

import { useState, useEffect, useRef } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { keccak256, toHex } from "viem";
import { agenticIdAbi } from "../lib/abi";

const MODEL_OPTIONS = [
  "Model 1",
  "Model 2",
  "Model 3",
  "Model 4",
  "Model 5",
  "Custom",
];

const CAPABILITY_OPTIONS = [
  "Coding",
  "Research",
  "Writing",
  "Trading",
  "Data Analysis",
  "Image Generation",
  "Conversation",
  "Task Automation",
];

function extractTokenIdFromReceipt(
  receipt: { status?: string; logs?: readonly { topics: readonly `0x${string}`[] }[] } | undefined
): bigint | null {
  if (receipt?.status !== "success" || !receipt.logs?.length) return null;
  const transferLog = receipt.logs[0];
  const topic = transferLog?.topics?.[3];
  if (!topic) return null;
  return BigInt(topic);
}

export default function MintForm({
  contractAddress,
  onMintSuccess,
  onMetaChange,
}: {
  contractAddress: `0x${string}`;
  onMintSuccess?: (tokenId: bigint) => void;
  onMetaChange?: (meta: { name: string; model: string; capabilities: string[]; imageUrl: string }) => void;
}) {
  const { address, isConnected } = useAccount();

  const [agentName, setAgentName] = useState("");
  const [model, setModel] = useState(MODEL_OPTIONS[0]);
  const [customModel, setCustomModel] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const { data: mintFee, isError: mintFeeError } = useReadContract({
    address: contractAddress,
    abi: agenticIdAbi,
    functionName: "mintFee",
  });

  const {
    data: txHash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const {
    data: receipt,
    isLoading: isConfirming,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // Use refs for callbacks so the effect doesn't re-trigger on reference changes
  const onMintSuccessRef = useRef(onMintSuccess);
  useEffect(() => {
    onMintSuccessRef.current = onMintSuccess;
  }, [onMintSuccess]);

  // Track which txHash we already processed to avoid duplicate calls
  const processedTxRef = useRef<string | null>(null);

  useEffect(() => {
    const tokenId = extractTokenIdFromReceipt(receipt);
    if (
      tokenId !== null &&
      txHash &&
      processedTxRef.current !== txHash
    ) {
      processedTxRef.current = txHash;
      onMintSuccessRef.current?.(tokenId);
    }
  }, [receipt, txHash]);

  const toggleCapability = (cap: string) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleRegister = () => {
    if (!address || !agentName.trim()) return;

    const resolvedModel = model === "Custom" ? customModel.trim() : model;
    if (!resolvedModel) return;

    onMetaChange?.({
      name: agentName.trim(),
      model: resolvedModel,
      capabilities: [...capabilities],
      imageUrl: imageUrl.trim(),
    });

    const datas = [
      {
        dataDescription: "agent_name",
        dataHash: keccak256(toHex(agentName.trim())),
      },
      {
        dataDescription: "model",
        dataHash: keccak256(toHex(resolvedModel)),
      },
      {
        dataDescription: "capabilities",
        dataHash: keccak256(toHex(capabilities.join(","))),
      },
      {
        dataDescription: "system_prompt",
        dataHash: keccak256(toHex(systemPrompt.trim() || "default")),
      },
      {
        dataDescription: "image_url",
        dataHash: keccak256(toHex(imageUrl.trim() || "none")),
      },
    ];

    writeContract({
      address: contractAddress,
      abi: agenticIdAbi,
      functionName: "iMint",
      args: [address, datas],
      value: (mintFee as bigint) ?? BigInt(0),
    });
  };

  const isBusy = isWritePending || isConfirming;
  const displayError = writeError || confirmError;
  const successTokenId = extractTokenIdFromReceipt(receipt)?.toString() ?? null;
  const canSubmit =
    isConnected &&
    !isBusy &&
    agentName.trim() !== "" &&
    (model !== "Custom" || customModel.trim() !== "");

  return (
    <div className="og-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold og-gradient-text">
          Register AI Agent
        </h2>
      </div>

      {mintFeeError && (
        <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-og-sm text-sm text-yellow-300">
          Unable to read contract. Make sure you are connected to
          0G-Galileo-Testnet.
        </div>
      )}

      {/* Agent Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-og-label">Agent Name</label>
        <input
          type="text"
          placeholder="e.g. ResearchBot-v2"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          className="w-full bg-og-dark border border-og-border rounded-og-sm px-3 py-2.5 text-sm text-[#F5F5F7] placeholder-[#5A5A6E] focus:outline-none focus:border-og-accent focus:ring-1 focus:ring-og-accent/30 transition-colors"
        />
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-og-label">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-og-dark border border-og-border rounded-og-sm px-3 py-2.5 text-sm text-[#F5F5F7] focus:outline-none focus:border-og-accent focus:ring-1 focus:ring-og-accent/30 transition-colors"
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {model === "Custom" && (
          <input
            type="text"
            placeholder="Enter custom model name"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            className="w-full bg-og-dark border border-og-border rounded-og-sm px-3 py-2.5 text-sm text-[#F5F5F7] placeholder-[#5A5A6E] focus:outline-none focus:border-og-accent focus:ring-1 focus:ring-og-accent/30 transition-colors"
          />
        )}
      </div>

      {/* Capabilities Multi-select */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-og-label">
          Capabilities
        </label>
        <div className="flex flex-wrap gap-2">
          {CAPABILITY_OPTIONS.map((cap) => (
            <button
              key={cap}
              type="button"
              onClick={() => toggleCapability(cap)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                capabilities.includes(cap)
                  ? "bg-og-purple text-white shadow-[0_0_12px_rgba(146,0,225,0.3)]"
                  : "og-btn-secondary"
              }`}
            >
              {cap}
            </button>
          ))}
        </div>
        {capabilities.length > 0 && (
          <p className="text-xs text-[#5A5A6E]">
            Selected: {capabilities.join(", ")}
          </p>
        )}
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-og-label">
          System Prompt{" "}
          <span className="text-[#5A5A6E] font-normal">(optional)</span>
        </label>
        <textarea
          placeholder="You are a helpful assistant that..."
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={3}
          className="w-full bg-og-dark border border-og-border rounded-og-sm px-3 py-2.5 text-sm text-[#F5F5F7] placeholder-[#5A5A6E] focus:outline-none focus:border-og-accent focus:ring-1 focus:ring-og-accent/30 transition-colors resize-none"
        />
      </div>

      {/* Image URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-og-label">
          Image URL{" "}
          <span className="text-[#5A5A6E] font-normal">(optional)</span>
        </label>
        <input
          type="url"
          placeholder="https://.../agent.png"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full bg-og-dark border border-og-border rounded-og-sm px-3 py-2.5 text-sm text-[#F5F5F7] placeholder-[#5A5A6E] focus:outline-none focus:border-og-accent focus:ring-1 focus:ring-og-accent/30 transition-colors"
        />
      </div>

      {/* Data Hashing Info */}
      <div className="p-3 bg-og-purple/5 border border-og-border rounded-og-sm">
        <p className="text-xs text-og-label">
          Your agent&apos;s data will be hashed on-chain as intelligent data
          entries (ERC-7857). The original data stays private — only
          cryptographic proofs are stored.
        </p>
      </div>

      {/* Register Button */}
      <button
        onClick={handleRegister}
        disabled={!canSubmit}
        className="w-full og-btn-primary px-4 py-3 font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isWritePending
          ? "Confirm in Wallet..."
          : isConfirming
            ? "Registering Agent..."
            : "Register Agent"}
      </button>

      {successTokenId && (
        <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-og-sm text-sm text-green-400">
          Agent registered! Agentic ID #{successTokenId}
        </div>
      )}

      {displayError && (
        <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-og-sm text-sm text-red-400 break-all">
          {(displayError as Error).message?.includes("User rejected")
            ? "Transaction rejected by user."
            : `Error: ${(displayError as unknown as { shortMessage?: string }).shortMessage || (displayError as Error).message || "Transaction failed"}`}
        </div>
      )}

      {receipt?.status === "reverted" && (
        <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-og-sm text-sm text-red-400">
          Transaction reverted on-chain. Check your balance and try again.
        </div>
      )}
    </div>
  );
}
