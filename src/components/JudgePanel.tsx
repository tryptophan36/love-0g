'use client'
import type { Agent, JudgeScore } from '@/app/orchestrator/src/types'
import { AgentAvatar } from '@/components/arena/AgentAvatar'
import { AGENT_COLORS } from '@/lib/arena/constants'

const DIMS = ['chemistry', 'humor', 'authenticity', 'compatibility'] as const

const DIM_COLORS: Record<string, string> = {
  chemistry:      'from-pink-500 to-rose-400',
  humor:          'from-amber-500 to-yellow-400',
  authenticity:   'from-emerald-500 to-teal-400',
  compatibility:  'from-og-purple to-og-accent',
}

export default function JudgePanel({ scores, contestants }: { scores: JudgeScore[]; contestants: Agent[] }) {
  if (!scores.length) {
    return (
      <div className="og-card p-5 h-48 flex flex-col items-center justify-center gap-2 text-center">
        <div className="w-8 h-8 rounded-full bg-og-surface border border-og-border flex items-center justify-center">
          <svg className="w-4 h-4 text-og-label" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm text-og-label">Judge scores appear after the match ends</p>
      </div>
    )
  }

  const nameMap = Object.fromEntries(contestants.map(a => [a.id, a.name]))
  const sorted  = [...scores].sort((a, b) => b.total - a.total)

  return (
    <div className="og-card p-5 space-y-5">
      <h3 className="text-sm font-semibold text-og-label uppercase tracking-wider">Judge scores</h3>
      {sorted.map((s, rank) => {
        const idx = contestants.findIndex(a => a.id === s.agentId)
        const agent = idx >= 0 ? contestants[idx] : undefined
        const color = AGENT_COLORS[(idx >= 0 ? idx : 0) % AGENT_COLORS.length]
        return (
        <div key={s.agentId}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <AgentAvatar
                agent={agent}
                fallbackName={nameMap[s.agentId] ?? s.agentId}
                ringClass={color.ring}
                size="md"
              />
              {rank === 0 && (
                <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium shrink-0">
                  Winner
                </span>
              )}
              {rank === 1 && (
                <span className="text-xs bg-og-surface text-og-label border border-og-border px-2 py-0.5 rounded-full font-medium shrink-0">
                  Runner-up
                </span>
              )}
              <span className="text-sm font-semibold text-white truncate">{nameMap[s.agentId] ?? s.agentId}</span>
            </div>
            <span className="text-sm font-bold text-og-accent tabular-nums">{s.total.toFixed(1)}</span>
          </div>

          <div className="space-y-2 mb-2">
            {DIMS.map(dim => (
              <div key={dim} className="flex items-center gap-2">
                <span className="text-xs text-og-label w-24 capitalize">{dim}</span>
                <div className="flex-1 bg-og-surface rounded-full h-1.5 border border-og-border overflow-hidden">
                  <div
                    className={`bg-gradient-to-r ${DIM_COLORS[dim]} h-1.5 rounded-full transition-all duration-700`}
                    style={{ width: `${(s[dim] / 10) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-og-light w-4 tabular-nums">{s[dim]}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-og-label italic leading-relaxed">{s.reasoning}</p>
          {rank < sorted.length - 1 && <div className="mt-4 border-t border-og-border" />}
        </div>
        )
      })}
    </div>
  )
}
