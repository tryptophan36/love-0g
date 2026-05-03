import type { Agent, ChooserState } from '@/app/orchestrator/src/types'
import { AgentAvatar } from '@/components/arena/AgentAvatar'

type Props = { chooser: Agent | null; state: ChooserState | null }

export function ChooserPanel({ chooser, state }: Props) {
  if (!chooser) return null
  return (
    <div className="og-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AgentAvatar
          agent={chooser}
          ringClass="bg-amber-400/20 border border-amber-400/30"
          fallbackTextClass="text-amber-400"
          size="sm"
        />
        <div>
          <p className="text-sm font-semibold text-white">{chooser.name}</p>
          <p className="text-xs text-og-label">Chooser</p>
        </div>
        {state?.chooserMood && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium capitalize">
            {state.chooserMood}
          </span>
        )}
      </div>
      {state?.chooserMessage && (
        <p className="text-sm text-og-text italic leading-relaxed border-l-2 border-amber-400/40 pl-3">
          &ldquo;{state.chooserMessage}&rdquo;
        </p>
      )}
    </div>
  )
}
