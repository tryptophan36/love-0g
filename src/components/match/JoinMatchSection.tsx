"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useSendTransaction, useSwitchChain } from "wagmi";
import { formatEther } from "viem";
import { MATCH_CHAIN_ID } from "@/lib/matchEscrow";
import { zgTestnet } from "@/lib/config";
import { isMatchOpenForJoin } from "@/lib/matchStatus";
import { rememberMatch } from "./recentMatchesStorage";
import { MatchStatusBadge } from "./MatchStatusBadge";

type MatchSnapshot = {
  matchId: string;
  feeWei: string;
  status: number;
  statusLabel: string;
  participantsJoined: number;
  maxParticipants: number;
  joinDeadline: string;
  chooser: string;
  chooserAgentId?: string;
};

type JoinTxBody = {
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
  chainId: number;
  match: MatchSnapshot & { seatsTaken: number; maxContestants: number };
};

function formatDeadlineTs(raw: string): string {
  try {
    const sec = BigInt(raw);
    if (sec === BigInt(0)) return "—";
    return new Date(Number(sec) * 1000).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function JoinMatchSection({ onJoined }: { onJoined?: () => void }) {
  const { address, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync, isPending: isSending, error: sendError } =
    useSendTransaction();

  const [matchIdInput, setMatchIdInput] = useState("");
  const [agentIdInput, setAgentIdInput] = useState("");
  const [snapshot, setSnapshot] = useState<MatchSnapshot | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  const loadMatch = async () => {
    setFetchError(null);
    setSnapshot(null);
    setDoneId(null);
    if (!matchIdInput.trim()) {
      setFetchError("Enter a match ID.");
      return;
    }
    const id = matchIdInput.trim();
    const res = await fetch(`/api/matches/${encodeURIComponent(id)}`);
    console.log(res);
    const body = (await res.json().catch(() => ({}))) as { match?: MatchSnapshot; error?: string };
    console.log(body);
    if (!res.ok) {
      setFetchError(body?.error ?? "Could not load match.");
      return;
    }
    if (!body.match) {
      setFetchError("Invalid response from server.");
      return;
    }
    setSnapshot(body.match);
  };

  const confirmJoin = async () => {
    if (!snapshot || !isConnected || !isMatchOpenForJoin(snapshot.status)) return;
    if (!agentIdInput.trim() || isNaN(Number(agentIdInput))) {
      setFetchError("Enter your agent's token ID.");
      return;
    }
    setFetchError(null);
    try {
      const res = await fetch("/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: snapshot.matchId,
          agentId: agentIdInput.trim(),
          sender: address,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as JoinTxBody & { error?: string };
      if (!res.ok) {
        setFetchError(body?.error ?? "Could not build join transaction.");
        return;
      }
      if (!body.to || !body.data || body.value === undefined) {
        setFetchError("Invalid join response from server.");
        return;
      }

      try {
        await switchChainAsync?.({ chainId: MATCH_CHAIN_ID });
      } catch {
        //
      }
      await sendTransactionAsync({
        to: body.to,
        data: body.data,
        value: BigInt(body.value),
        chainId: zgTestnet.id,
      });
      rememberMatch(snapshot.matchId);
      onJoined?.();
      setDoneId(snapshot.matchId);
      setSnapshot(null);
      setMatchIdInput("");
      setAgentIdInput("");
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Transaction rejected or failed.");
    }
  };

  return (
    <section className="og-card p-6 border border-og-border relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-og-purple/5 via-transparent to-og-accent/5 pointer-events-none" />
      <div className="relative">
        <h2 className="text-lg font-semibold text-white mb-1">Join a match</h2>
        <p className="text-sm text-og-label mb-5 leading-relaxed">
          Enter the on-chain match ID and your agent token ID. We load status and headcount from
          the contract; you only sign if the match is open.

        </p>

        <label className="block text-xs font-medium text-og-label uppercase tracking-wider mb-2">
          Match ID
        </label>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            inputMode="numeric"
            value={matchIdInput}
            onChange={(e) => setMatchIdInput(e.target.value)}
            className="flex-1 bg-og-surface border border-og-border rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-og-label focus:outline-none focus:border-og-accent/50"
            placeholder="e.g. 1"
            disabled={Boolean(doneId)}
          />
          <button
            type="button"
            disabled={!isConnected || !matchIdInput.trim()}
            onClick={() => void loadMatch()}
            className="sm:w-auto px-5 py-2.5 rounded-xl border border-og-border text-og-text font-semibold text-sm hover:bg-og-surface transition-colors disabled:opacity-45"
          >
            Load match
          </button>
        </div>

        {snapshot && (
          <>
            <div className="rounded-lg border border-og-border bg-og-surface/40 px-4 py-4 mb-4 space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-og-label">Status</span>
                  <MatchStatusBadge status={snapshot.status} />
                </div>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-og-label">Participants joined</span>
                <span className="text-white font-medium tabular-nums">
                  {snapshot.participantsJoined}{" "}
                  <span className="text-og-label font-normal">/</span>{" "}
                  {snapshot.maxParticipants}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-og-label">Entry fee</span>
                <span className="text-white font-mono">
                  {formatEther(BigInt(snapshot.feeWei))} 0G
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-og-label">Join deadline</span>
                <span className="text-og-light text-right text-xs sm:text-sm">
                  {formatDeadlineTs(snapshot.joinDeadline)}
                </span>
              </div>

              <div className="flex justify-between gap-4 items-start">
                <span className="text-og-label shrink-0">Chooser</span>
                <span className="text-og-light font-mono text-xs break-all text-right">
                  {snapshot.chooser.slice(0, 10)}…{snapshot.chooser.slice(-8)}
                </span>
              </div>

              {snapshot.chooserAgentId && snapshot.chooserAgentId !== "0" && (
                <div className="flex justify-between gap-4">
                  <span className="text-og-label">Chooser&apos;s agent</span>
                  <span className="text-og-light font-mono text-sm">#{snapshot.chooserAgentId}</span>
                </div>
              )}
            </div>

            {isMatchOpenForJoin(snapshot.status) && (
              <>
                <label className="block text-xs font-medium text-og-label uppercase tracking-wider mb-2">
                  Your agent token ID
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={agentIdInput}
                  onChange={(e) => setAgentIdInput(e.target.value)}
                  className="w-full bg-og-surface border border-og-border rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-og-label focus:outline-none focus:border-og-accent/50 mb-3"
                  placeholder="e.g. 3"
                />
                <button
                  type="button"
                  disabled={!isConnected || isSending || !agentIdInput.trim()}
                  onClick={() => void confirmJoin()}
                  className="w-full py-3 rounded-xl bg-og-accent text-white font-semibold text-sm hover:bg-og-purple transition-colors disabled:opacity-45"
                >
                  {isSending ? "Confirm in wallet…" : "Pay fee & join"}
                </button>
              </>
            )}

            {!isMatchOpenForJoin(snapshot.status) && (
              <p className="text-sm text-amber-400/95 mt-2 leading-relaxed">
                This match is not open for new participants ({snapshot.statusLabel}). You cannot
                join from this screen.
              </p>
            )}
          </>
        )}

        {(fetchError || sendError) && (
          <p className="text-sm text-red-400 mb-3">
            {fetchError ?? sendError?.message}
          </p>
        )}

        {doneId && (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <p className="mb-3">Joined match #{doneId}. Open the arena when the match runs.</p>
            <Link
              href={`/arena/${doneId}`}
              className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-emerald-600/90 text-white font-semibold hover:bg-emerald-500 transition-colors"
            >
              Go to arena
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
