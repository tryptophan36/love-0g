"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { CreateMatchModal } from "./CreateMatchModal";
import { JoinMatchSection } from "./JoinMatchSection";
import { RecentMatchesList } from "./RecentMatchesList";

export function MatchHub() {
  const { isConnected } = useAccount();
  const [createOpen, setCreateOpen] = useState(false);
  const [listRevision, setListRevision] = useState(0);

  const bumpList = useCallback(() => setListRevision((n) => n + 1), []);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <p className="text-og-accent text-xs font-semibold uppercase tracking-widest mb-2">
            On-chain escrow
          </p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Matches</h1>
          <p className="text-og-label text-sm mt-2 max-w-xl leading-relaxed">
            Create a match as chooser (pay the fee) or join an open match with its ID. Both actions
            use your wallet on 0G Galileo testnet.
          </p>
        </div>
        <button
          type="button"
          disabled={!isConnected}
          onClick={() => setCreateOpen(true)}
          className="shrink-0 px-6 py-3.5 rounded-xl bg-og-accent text-white font-semibold text-sm transition-all hover:bg-og-purple hover:shadow-[0_0_28px_rgba(183,95,255,0.4)] hover:-translate-y-0.5 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-og-accent disabled:hover:shadow-none disabled:hover:translate-y-0"
        >
          Create match
        </button>
      </div>

      {isConnected ? (
        <>
          <JoinMatchSection onJoined={bumpList} />
          <RecentMatchesList revision={listRevision} />
        </>
      ) : (
        <section className="og-card p-6 border border-og-border">
          <h2 className="text-lg font-semibold text-white mb-1">Wallet required</h2>
          <p className="text-sm text-og-label leading-relaxed">
            Connect your wallet to load and join matches.
          </p>
        </section>
      )}

      <CreateMatchModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onMatchCreated={bumpList}
      />
    </>
  );
}
