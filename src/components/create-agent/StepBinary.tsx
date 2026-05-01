import { BINARY_QUESTIONS, type BinaryChoice } from '@/lib/traitMapper'
import { StepShell } from './StepShell'
import type { BinaryAnswers } from './types'

type StepBinaryProps = {
  binaries: BinaryAnswers
  setBinaries: React.Dispatch<React.SetStateAction<BinaryAnswers>>
  onBack: () => void
  onNext: () => void
}

export function StepBinary({ binaries, setBinaries, onBack, onNext }: StepBinaryProps) {
  const choose = (index: number, side: BinaryChoice) => {
    setBinaries(prev => prev.map((value, idx) => (idx === index ? side : value)))
  }

  const allAnswered = binaries.every(b => b !== null)

  return (
    <StepShell
      step={3}
      heading="This or that?"
      sub="No right answer — just go with your gut."
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!allAnswered}
    >
      <div className="space-y-6">
        {BINARY_QUESTIONS.map((q, i) => (
          <div key={i} className="space-y-3">
            <p className="text-og-label text-xs uppercase tracking-widest">{q.question}</p>
            <div className="grid grid-cols-2 gap-3">
              {(['left', 'right'] as BinaryChoice[]).map(side => {
                const option = q[side]
                const chosen = binaries[i] === side
                return (
                  <button
                    key={side}
                    onClick={() => choose(i, side)}
                    className={`py-4 px-4 rounded-2xl border text-sm font-medium text-center
                                transition-all duration-200
                                ${
                                  chosen
                                    ? 'bg-og-accent/15 border-og-accent text-white shadow-[0_0_16px_rgba(183,95,255,0.25)]'
                                    : 'border-og-border text-og-label hover:border-og-accent/40 hover:text-white'
                                }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </StepShell>
  )
}
