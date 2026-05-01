import { ICEBREAKER_PROMPTS } from '@/lib/traitMapper'
import { StepShell } from './StepShell'

type StepPromptProps = {
  promptIdx: number
  setPromptIdx: (index: number) => void
  promptAnswer: string
  setPromptAnswer: (value: string) => void
  onBack: () => void
  onNext: () => void
}

export function StepPrompt({
  promptIdx,
  setPromptIdx,
  promptAnswer,
  setPromptAnswer,
  onBack,
  onNext,
}: StepPromptProps) {
  return (
    <StepShell
      step={4}
      heading="Finish the prompt."
      sub="Pick a line and let them answer it. This becomes how they open conversations."
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!promptAnswer.trim()}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          {ICEBREAKER_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => setPromptIdx(i)}
              className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all duration-200
                          ${
                            promptIdx === i
                              ? 'bg-og-accent/10 border-og-accent text-white'
                              : 'border-og-border text-og-label hover:border-og-accent/40 hover:text-white'
                          }`}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="relative mt-2">
          <div className="bg-og-surface border border-og-border rounded-2xl p-4 space-y-3">
            <p className="text-og-label text-sm italic">&ldquo;{ICEBREAKER_PROMPTS[promptIdx]}&rdquo;</p>
            <textarea
              value={promptAnswer}
              onChange={e => setPromptAnswer(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="Their answer…"
              className="w-full bg-transparent text-white text-base placeholder-og-label/50
                         focus:outline-none resize-none"
            />
            <p className="text-right text-xs text-og-label/50">{promptAnswer.length}/120</p>
          </div>
        </div>
      </div>
    </StepShell>
  )
}
