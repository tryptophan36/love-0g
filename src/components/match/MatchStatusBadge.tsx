import { matchStatusBadgeClassName, matchStatusLabel } from "@/lib/matchStatus";

export function MatchStatusBadge({ status }: { status: number }) {
  return (
    <span
      className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border font-medium ${matchStatusBadgeClassName(status)}`}
    >
      {matchStatusLabel(status)}
    </span>
  );
}
