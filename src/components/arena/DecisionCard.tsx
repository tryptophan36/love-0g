import type { Agent, ChooserDecision } from '@/app/orchestrator/src/types'
import { AgentAvatar } from '@/components/arena/AgentAvatar'

type Props = { decision: ChooserDecision; chooserName: string; chooser?: Agent | null }

export function DecisionCard({ decision, chooserName, chooser }: Props) {
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-og-surface/60 to-og-accent/10 p-6 text-center space-y-3">
      <div className="flex justify-center">
        <AgentAvatar
          agent={chooser ?? undefined}
          fallbackName={chooserName}
          ringClass="bg-amber-400/25 border border-amber-400/35"
          fallbackTextClass="text-amber-400"
          size="lg"
        />
      </div>
      <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest">
        {chooserName} has made their choice
      </p>
      <p className="text-white text-base leading-relaxed">{decision.announcement}</p>
      <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-full px-4 py-1.5">
        <span className="text-amber-400 text-sm font-semibold">❤️ {decision.pickedAgentName}</span>
      </div>
      {decision.reasoning && (
        <p className="text-xs text-og-label italic">{decision.reasoning}</p>
      )}
    </div>
  )
}
