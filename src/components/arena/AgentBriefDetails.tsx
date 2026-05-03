import type { Agent } from '@/app/orchestrator/src/types'

function shortenAddress(addr: string): string {
  if (!addr) return '—'
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function AgentBriefDetails({ agent }: { agent: Agent }) {
  const p = agent.profile
  const headline = [p?.profession, p?.origin].filter(Boolean).join(' · ')
  const demographics = [p?.age, p?.gender].filter(Boolean).join(' · ')
  const played = (agent.wins ?? 0) + (agent.losses ?? 0)
  const record =
    played > 0 ? `${agent.wins ?? 0}W · ${agent.losses ?? 0}L` : 'No matches yet'

  return (
    <div className="w-full space-y-1.5 text-left">
      {headline ? (
        <p className="text-xs text-og-text leading-snug">{headline}</p>
      ) : null}
      {demographics ? (
        <p className="text-[11px] text-og-label"> {demographics}</p>
      ) : null}
      {p?.education?.trim() ? (
        <p className="text-[11px] text-og-label line-clamp-2"> Education: {p.education}</p>
      ) : null}
      {p?.hobbies?.trim() ? (
        <p className="text-[11px] text-og-label line-clamp-2"> Hobbies: {p.hobbies}</p>
      ) : null}
    </div>
  )
}
