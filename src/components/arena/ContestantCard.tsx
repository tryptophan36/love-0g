'use client'

import dynamic from 'next/dynamic'
import type { Agent, ChooserState } from '@/app/orchestrator/src/types'
import type { AgentColor } from '@/lib/arena/constants'
import { vibeBadgeClass } from '@/lib/arena/constants'
import { AgentAvatar } from '@/components/arena/AgentAvatar'

const TraitRadar = dynamic(() => import('@/components/TraitRadar'), { ssr: false })

type Props = {
  agent: Agent
  reaction?: ChooserState['reactions'][string]
  color: AgentColor
  isWinner: boolean
}

export function ContestantCard({ agent, reaction, color, isWinner }: Props) {
  return (
    <div
      className={`og-card p-4 flex flex-col items-center gap-3 relative ${isWinner ? 'ring-1 ring-amber-400/40' : ''}`}
    >
      {isWinner && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
          ❤️ Chosen
        </div>
      )}
      <div className="flex items-center gap-2 w-full">
        <AgentAvatar agent={agent} ringClass={color.ring} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{agent.name}</p>
          <p className="text-xs text-og-label">#{agent.tokenId}</p>
        </div>
        {reaction?.vibe && (
          <span
            className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${vibeBadgeClass(reaction.vibe)}`}
          >
            {reaction.vibe.replace('_', ' ')}
          </span>
        )}
      </div>

      {reaction !== undefined && (
        <div className="w-full space-y-1">
          <div className="flex justify-between text-xs text-og-label">
            <span>Score</span>
            <span className={`font-medium ${color.text}`}>
              {((reaction?.score ?? 0) * 10).toFixed(1)}/10
            </span>
          </div>
          <div className="w-full bg-og-surface rounded-full h-1.5 border border-og-border overflow-hidden">
            <div
              className={`bg-gradient-to-r ${color.bar} h-1.5 rounded-full transition-all duration-700`}
              style={{ width: `${(reaction?.score ?? 0) * 100}%` }}
            />
          </div>
          {reaction?.flag && (
            <p className="text-[10px] text-red-400/80">⚠ {reaction.flag.replace(/_/g, ' ')}</p>
          )}
        </div>
      )}

      <TraitRadar traits={agent.traits} size={120} />
    </div>
  )
}
