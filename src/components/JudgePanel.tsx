// components/JudgePanel.tsx
'use client'
import type { JudgeScore, Agent } from '@/packages/shared/types'

const DIMS = ['chemistry', 'humor', 'authenticity', 'compatibility'] as const

export default function JudgePanel({ scores, contestants }: { scores: JudgeScore[]; contestants: Agent[] }) {
  if (!scores.length) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4 h-48 flex items-center justify-center text-sm text-neutral-400">
        Judge scores appear after match ends
      </div>
    )
  }

  const nameMap = Object.fromEntries(contestants.map(a => [a.id, a.name]))
  const sorted  = [...scores].sort((a, b) => b.total - a.total)

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-4">
      <p className="text-sm font-medium">Judge scores</p>
      {sorted.map((s, rank) => (
        <div key={s.agentId}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {rank === 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Winner</span>}
              <span className="text-sm font-medium">{nameMap[s.agentId]}</span>
            </div>
            <span className="text-sm font-medium">{s.total.toFixed(1)}/10</span>
          </div>
          <div className="space-y-1 mb-2">
            {DIMS.map(dim => (
              <div key={dim} className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 w-24 capitalize">{dim}</span>
                <div className="flex-1 bg-neutral-100 rounded-full h-1">
                  <div className="bg-neutral-900 h-1 rounded-full transition-all duration-700"
                       style={{ width: `${(s[dim] / 10) * 100}%` }} />
                </div>
                <span className="text-xs text-neutral-500 w-4">{s[dim]}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-400 italic">{s.reasoning}</p>
        </div>
      ))}
    </div>
  )
}