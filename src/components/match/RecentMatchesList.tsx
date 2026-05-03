"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadRecentMatches, rememberMatch } from "./recentMatchesStorage";
import { MatchStatusBadge } from "./MatchStatusBadge";

type MatchSnapshot = {
  status: number;
  participantsJoined: number;
  maxParticipants: number;
};

function RecentMatchRow({ id, onCopy }: { id: string; onCopy: () => void }) {
  const [snap, setSnap] = useState<MatchSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/matches/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { match?: MatchSnapshot } | null) => {
        if (!cancelled && body?.match) {
          setSnap({
            status: body.match.status,
            participantsJoined: body.match.participantsJoined,
            maxParticipants: body.match.maxParticipants,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    
  }, [id]);

  return (
    <li className="rounded-lg border border-og-border bg-og-surface/30 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-sm text-og-accent shrink-0">#{id}</span>
          {snap ? (
            <>
              <MatchStatusBadge status={snap.status} />
              <span className="text-xs text-og-label tabular-nums">
                {snap.participantsJoined}/{snap.maxParticipants} joined
              </span>
            </>
          ) : (
            <span className="text-xs text-og-label">Loading…</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(id);
              rememberMatch(id);
              onCopy();
            }}
            className="text-xs text-og-label hover:text-white transition-colors"
          >
            Copy
          </button>
          <Link
            href={`/arena/${id}`}
            className="text-xs font-semibold text-og-accent hover:text-og-light"
          >
            Arena →
          </Link>
        </div>
      </div>
    </li>
  );
}

export function RecentMatchesList({ revision }: { revision: number }) {
  const [items, setItems] = useState<ReturnType<typeof loadRecentMatches>>([]);
  const [copyBust, setCopyBust] = useState(0);

  useEffect(() => {
    setItems(loadRecentMatches());
  }, [revision, copyBust]);

  const recheckAfterCopy = () => setCopyBust((n) => n + 1);

  if (items.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold text-og-label uppercase tracking-wider mb-3">
        Recent match IDs
      </h2>
      <ul className="space-y-2">
        {items.map((m) => (
          <RecentMatchRow key={m.id} id={m.id} onCopy={recheckAfterCopy} />
        ))}
      </ul>
    </div>
  );
}
