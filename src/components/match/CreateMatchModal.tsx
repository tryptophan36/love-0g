"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { parseEther } from "viem";
import { BaseModal } from "./BaseModal";
import {
  extractCreatedMatchIdFromReceipt,
  getMatchContractAddress,
  MATCH_CHAIN_ID,
} from "@/lib/matchEscrow";
import { rememberMatch } from "./recentMatchesStorage";
import { zgTestnet } from "@/lib/config";
import { MatchStatusBadge } from "./MatchStatusBadge";

type CreateMatchModalProps = {
  open: boolean;
  onClose: () => void;
  onMatchCreated?: (matchId: string) => void;
};

type Phase = "form" | "success";

export function CreateMatchModal({
  open,
  onClose,
  onMatchCreated,
}: CreateMatchModalProps) {
  const { isConnected, address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync, isPending: isSending, error: sendError } =
    useSendTransaction();

  const [feeEth, setFeeEth] = useState("0.01");
  const [maxSeats, setMaxSeats] = useState<1 | 2 | 3>(2);
  const [agentId, setAgentId] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [buildError, setBuildError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!open) {
      setPhase("form");
      setTxHash(undefined);
      setBuildError(null);
      setCreatedId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!receipt || !isConfirmed || phase !== "form" || !txHash) return;
    let id: string | null = null;
    try {
      const addr = getMatchContractAddress();
      const mid = extractCreatedMatchIdFromReceipt(receipt, addr);
      if (mid !== null) {
        id = mid.toString();
        setCreatedId(id);
        rememberMatch(id);
        onMatchCreated?.(id);
      }
    } catch {
      // env / chain mismatch — still mark success without id
    }
    setPhase("success");
  }, [receipt, isConfirmed, phase, txHash, onMatchCreated]);

  const handleCreate = async () => {
    setBuildError(null);
    if (!isConnected) {
      setBuildError("Connect your wallet first.");
      return;
    }
    let feeWei: bigint;
    try {
      feeWei = parseEther(feeEth.trim() || "0");
    } catch {
      setBuildError("Enter a valid fee amount.");
      return;
    }
    if (feeWei <= BigInt(0)) {
      setBuildError("Fee must be greater than zero.");
      return;
    }
    if (!agentId.trim()) {
      setBuildError("Enter your agent's token ID.");
      return;
    }

    const res = await fetch("/api/matches/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeWei: feeWei.toString(),
        maxSeats,
        agentId: agentId.trim(),
        sender: address,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBuildError(
        typeof body?.error === "string" ? body.error : "Failed to build transaction."
      );
      return;
    }

    try {
      try {
        await switchChainAsync?.({ chainId: MATCH_CHAIN_ID });
      } catch {
        // User rejected switch or already on chain
      }

      const hash = await sendTransactionAsync({
        to: body.to,
        data: body.data as `0x${string}`,
        value: BigInt(body.value),
        chainId: zgTestnet.id,
      });
      setTxHash(hash);
    } catch (e) {
      setBuildError(e instanceof Error ? e.message : "Transaction rejected or failed.");
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={phase === "success" ? "Match created" : "Create match"}
    >
      {phase === "form" && (
        <>
          <p className="text-sm text-og-label mb-5 leading-relaxed">
            You pay the entry fee in native 0G when you confirm. Choose your agent, set the fee
            and max seats — contestants join by paying the same fee.
          </p>

          <label className="block text-xs font-medium text-og-label uppercase tracking-wider mb-2">
            Your agent token ID
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="w-full bg-og-surface border border-og-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-og-label mb-4 focus:outline-none focus:border-og-accent/50 font-mono"
            placeholder="e.g. 7"
          />

          <label className="block text-xs font-medium text-og-label uppercase tracking-wider mb-2">
            Entry fee (0G)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={feeEth}
            onChange={(e) => setFeeEth(e.target.value)}
            className="w-full bg-og-surface border border-og-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-og-label mb-4 focus:outline-none focus:border-og-accent/50 font-mono"
            placeholder="0.01"
          />

          <label className="block text-xs font-medium text-og-label uppercase tracking-wider mb-2">
            Max contestants
          </label>
          <div className="flex gap-3 mb-4">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxSeats(n)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                  maxSeats === n
                    ? "border-og-accent bg-og-accent/10 text-og-accent"
                    : "border-og-border text-og-label hover:bg-og-surface"
                }`}
              >
                {n === 1 ? "1 contestant" : `${n} contestants`}
              </button>
            ))}
          </div>

          {(buildError || sendError) && (
            <p className="text-sm text-red-400 mb-3">
              {buildError ?? sendError?.message ?? "Transaction failed."}
            </p>
          )}

          <button
            type="button"
            disabled={!isConnected || isSending || isConfirming}
            onClick={() => void handleCreate()}
            className="w-full py-3 rounded-xl bg-og-accent text-white font-semibold text-sm transition-colors hover:bg-og-purple disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {!isConnected
              ? "Connect wallet"
              : isSending
                ? "Confirm in wallet…"
                : isConfirming
                  ? "Confirming on-chain…"
                  : "Create & pay fee"}
          </button>
        </>
      )}

      {phase === "success" && (
        <>
          <p className="text-sm text-og-label mb-4 leading-relaxed">
            {createdId
              ? "Your match is live on-chain. Share the ID with contestants or open the arena when the orchestrator is running."
              : "Transaction confirmed. If the match ID did not parse, check the receipt on the explorer."}
          </p>
          {createdId && (
            <div className="rounded-lg border border-og-border bg-og-surface/50 px-4 py-3 mb-5 space-y-3">
              <div>
                <div className="text-xs text-og-label uppercase tracking-wider mb-1">Match ID</div>
                <div className="font-mono text-og-accent text-lg break-all">{createdId}</div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 border-t border-og-border/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-og-label uppercase tracking-wider">Status</span>
                  <MatchStatusBadge status={0} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-og-label uppercase tracking-wider">
                    Participants joined
                  </span>
                  <span className="text-sm text-white tabular-nums font-medium">
                    0 <span className="text-og-label font-normal">/</span> {maxSeats}
                  </span>
                </div>
                {agentId && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-og-label uppercase tracking-wider">Your agent</span>
                    <span className="text-sm text-white font-mono">#{agentId}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            {createdId && (
              <Link
                href={`/arena/${createdId}`}
                className="flex-1 text-center py-3 rounded-xl bg-og-accent text-white font-semibold text-sm hover:bg-og-purple transition-colors"
              >
                Open arena
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-og-border text-og-text font-semibold text-sm hover:bg-og-surface transition-colors"
            >
              Done
            </button>
          </div>
        </>
      )}
    </BaseModal>
  );
}
