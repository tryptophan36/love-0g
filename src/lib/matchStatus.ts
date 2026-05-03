/** Matches `MatchEscrow.MatchStatus` enum order (0–5). */
export function matchStatusLabel(status: number): string {
  const labels = [
    "Open",
    "Full",
    "Running",
    "Settled",
    "Cancelled",
    "Failed",
  ] as const;
  return labels[status] ?? `Unknown (${status})`;
}

export function matchStatusBadgeClassName(status: number): string {
  switch (status) {
    case 0:
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case 1:
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case 2:
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case 3:
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/25";
    case 4:
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case 5:
      return "bg-violet-500/15 text-violet-300 border-violet-500/35";
    default:
      return "bg-og-surface text-og-label border-og-border";
  }
}

/** Same as `MatchStatus.OPEN` on-chain (join allowed only when open). */
export function isMatchOpenForJoin(status: number): boolean {
  return status === 0;
}
